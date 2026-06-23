import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import { logEvent } from "@/lib/audit/log-event";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { ActorType } from "@/types/audit";
import type {
  CreateMessageInput,
  Message,
  MessageMetadata,
  MessageSenderType,
} from "@/types/messages";
import {
  createSupabaseMessageStore,
  type MessageStore,
} from "./message-store";
import { isMessageSenderType } from "./transform";

interface CreateMessageDependencies {
  store?: MessageStore;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
  allowPrivilegedSenderTypes?: boolean;
}

export async function createMessage(
  input: CreateMessageInput,
  dependencies: CreateMessageDependencies = {}
): Promise<Message> {
  const conversationId = input.conversationId?.trim();
  const body = input.body?.trim();
  const senderType = normalizeSenderType(input.senderType);
  const senderId = normalizeSenderId(input.senderId);
  const metadata = normalizeMetadata(input.metadata);

  if (!conversationId) {
    throw new NotificationError("conversationId is required.", undefined, 400);
  }

  if (!body) {
    throw new NotificationError("body is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseMessageStore();
  const conversation = await store.getConversation(conversationId);

  if (!conversation) {
    throw new NotificationError("Conversation not found.", undefined, 404);
  }

  if (senderType === "user") {
    if (!senderId) {
      throw new NotificationError("senderId is required.", undefined, 400);
    }

    const isMember = await store.isConversationMember(conversationId, senderId);
    if (!isMember) {
      throw new NotificationError(
        "User sender must be a conversation member.",
        undefined,
        403
      );
    }
  } else if (!dependencies.allowPrivilegedSenderTypes) {
    throw new NotificationError(
      "Privileged message sender types are server-side only.",
      undefined,
      403
    );
  }

  const message = await store.insertMessage({
    conversationId,
    senderId,
    senderType,
    body,
    metadata,
  });

  await logMessageCreated({
    message,
    projectId: conversation.projectId,
  });

  await notifyConversationMembers({
    message,
    senderId,
    store,
    notifyFn: dependencies.notifyFn ?? notify,
  });

  return message;
}

async function logMessageCreated({
  message,
  projectId,
}: {
  message: Message;
  projectId: string | null;
}) {
  const actorType = actorTypeFromSenderType(message.senderType);
  const title = activityTitle(message.senderType);
  const metadata = {
    conversationId: message.conversationId,
    messageId: message.id,
    senderType: message.senderType,
    projectId,
  };

  await logEvent({
    audit: {
      actorUserId: message.senderId,
      actorType,
      action: "message.created",
      entityType: "message",
      entityId: message.id,
      projectId,
      source: message.senderType === "task" ? "ai-extractor" : "project-chat",
      severity: "info",
      visibility: "admin",
      title,
      metadata,
    },
    activity: projectId
      ? {
          projectId,
          actorUserId: message.senderId,
          actorType,
          eventType: "message.created",
          entityType: "message",
          entityId: message.id,
          title,
          visibility: "project",
          severity: "info",
          metadata,
        }
      : null,
  });
}

function actorTypeFromSenderType(senderType: MessageSenderType): ActorType {
  switch (senderType) {
    case "admin":
      return "admin";
    case "system":
      return "system";
    case "ai":
    case "task":
      return "ai";
    default:
      return "user";
  }
}

function activityTitle(senderType: MessageSenderType): string {
  switch (senderType) {
    case "admin":
      return "Admin message added";
    case "ai":
      return "AI update added";
    case "system":
      return "System update added";
    case "task":
      return "Task update added";
    default:
      return "User message added";
  }
}

function normalizeSenderType(
  senderType: MessageSenderType | undefined
): MessageSenderType {
  if (!senderType) {
    return "user";
  }

  if (!isMessageSenderType(senderType)) {
    throw new NotificationError(
      `Unsupported message sender type: ${senderType}.`,
      undefined,
      400
    );
  }

  return senderType;
}

function normalizeSenderId(senderId: string | null | undefined): string | null {
  if (typeof senderId !== "string") {
    return null;
  }

  const trimmed = senderId.trim();
  return trimmed ? trimmed : null;
}

function normalizeMetadata(
  metadata: MessageMetadata | null | undefined
): MessageMetadata {
  if (!metadata || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}

async function notifyConversationMembers({
  message,
  senderId,
  store,
  notifyFn,
}: {
  message: Message;
  senderId: string | null;
  store: MessageStore;
  notifyFn: (payload: NotificationPayload) => Promise<unknown>;
}) {
  const members = await store.listConversationMembers(message.conversationId);
  const recipients = members
    .map((member) => member.userId)
    .filter((memberUserId) => memberUserId !== senderId);

  await Promise.all(
    recipients.map((userId) =>
      notifyFn(buildMessageNotificationPayload({ message, userId }))
    )
  );
}

function buildMessageNotificationPayload({
  message,
  userId,
}: {
  message: Message;
  userId: string;
}): NotificationPayload {
  const metadata = {
    ...message.metadata,
    conversationId: message.conversationId,
    messageId: message.id,
    pushPreviewAllowed: message.metadata.pushPreviewAllowed === true,
  };

  if (message.senderType === "user" || message.senderType === "admin") {
    return {
      userId,
      type: "message",
      source: "project-chat",
      title:
        message.senderType === "admin"
          ? "New admin project message"
          : "New project message",
      body: "You have a new message in a ChemVault project.",
      link: `/conversations/${message.conversationId}`,
      metadata,
    };
  }

  const source = message.senderType === "system" ? "system" : "ai-extractor";
  const type = message.senderType === "system" ? "system" : "task";

  return {
    userId,
    type,
    source,
    title: notificationTitle(message),
    body: notificationBody(message.senderType),
    link: notificationLink(message),
    metadata,
  };
}

function notificationTitle(message: Message): string {
  const title = message.metadata.notificationTitle;
  if (typeof title === "string" && title.trim()) {
    return title.trim();
  }

  switch (message.senderType) {
    case "ai":
      return "AI project update";
    case "task":
      return "AI task update";
    case "system":
      return "Project workflow update";
    default:
      return "Project message";
  }
}

function notificationBody(senderType: MessageSenderType): string {
  switch (senderType) {
    case "ai":
      return "ChemVault AI posted a project update.";
    case "task":
      return "A ChemVault task posted a project update.";
    case "system":
      return "A ChemVault workflow posted a project update.";
    default:
      return "You have a new ChemVault message.";
  }
}

function notificationLink(message: Message): string {
  const projectId = message.metadata.projectId;
  if (typeof projectId === "string" && projectId.trim()) {
    return `/projects/${projectId.trim()}/messages`;
  }

  return `/conversations/${message.conversationId}`;
}
