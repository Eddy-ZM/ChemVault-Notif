import { describe, expect, it } from "vitest";
import { createMessage } from "./create-message";
import type { MessageStore } from "./message-store";
import type { NotificationPayload } from "@/lib/notifications/types";
import type {
  Conversation,
  ConversationMember,
  Message,
  MessageRead,
} from "@/types/messages";

const conversationId = "11111111-1111-1111-1111-111111111111";
const senderId = "22222222-2222-2222-2222-222222222222";
const recipientId = "33333333-3333-3333-3333-333333333333";
const projectId = "44444444-4444-4444-4444-444444444444";

describe("createMessage", () => {
  it("rejects empty message bodies and non-member user senders", async () => {
    const memory = createMemoryMessageStore();

    await expect(
      createMessage(
        {
          conversationId,
          senderId,
          senderType: "user",
          body: " ",
        },
        { store: memory.store }
      )
    ).rejects.toThrow("body is required");

    await expect(
      createMessage(
        {
          conversationId,
          senderId: "99999999-9999-9999-9999-999999999999",
          senderType: "user",
          body: "Please review the extraction result.",
        },
        { store: memory.store }
      )
    ).rejects.toThrow("conversation member");
  });

  it("creates a user message and notifies other members without notifying the sender", async () => {
    const memory = createMemoryMessageStore();
    const notifications: NotificationPayload[] = [];

    const message = await createMessage(
      {
        conversationId,
        senderId,
        senderType: "user",
        body: "Can we rerun this with stricter validation?",
      },
      {
        store: memory.store,
        notifyFn: async (payload) => {
          notifications.push(payload);
          return payload;
        },
      }
    );

    expect(message).toMatchObject({
      conversationId,
      senderId,
      senderType: "user",
      body: "Can we rerun this with stricter validation?",
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      userId: recipientId,
      type: "message",
      source: "project-chat",
      title: "New project message",
      body: "You have a new message in a ChemVault project.",
      link: `/conversations/${conversationId}`,
      metadata: {
        conversationId,
        messageId: message.id,
        pushPreviewAllowed: false,
      },
    });
  });

  it("requires privileged access for task messages and notifies all members", async () => {
    const memory = createMemoryMessageStore();

    await expect(
      createMessage(
        {
          conversationId,
          senderId: null,
          senderType: "task",
          body: "Validation completed successfully.",
          metadata: { projectId },
        },
        { store: memory.store }
      )
    ).rejects.toThrow("server-side");

    const notifications: NotificationPayload[] = [];
    const message = await createMessage(
      {
        conversationId,
        senderId: null,
        senderType: "task",
        body: "Validation completed successfully.",
        metadata: {
          projectId,
          notificationTitle: "Validation completed",
        },
      },
      {
        allowPrivilegedSenderTypes: true,
        store: memory.store,
        notifyFn: async (payload) => {
          notifications.push(payload);
          return payload;
        },
      }
    );

    expect(message.senderType).toBe("task");
    expect(notifications.map((notification) => notification.userId).sort()).toEqual(
      [recipientId, senderId].sort()
    );
    expect(notifications[0]).toMatchObject({
      type: "task",
      source: "ai-extractor",
      title: "Validation completed",
      body: "A ChemVault task posted a project update.",
      link: `/projects/${projectId}/messages`,
      metadata: {
        conversationId,
        messageId: message.id,
        projectId,
        pushPreviewAllowed: false,
      },
    });
  });
});

function createMemoryMessageStore() {
  const conversation: Conversation = {
    id: conversationId,
    type: "project",
    projectId,
    title: "AI Paper Extraction Project",
    createdAt: "2026-06-22T08:00:00.000Z",
    updatedAt: "2026-06-22T08:00:00.000Z",
  };
  const members: ConversationMember[] = [
    createMember(senderId),
    createMember(recipientId),
  ];
  const messages: Message[] = [];
  const reads: MessageRead[] = [];

  const store: Pick<
    MessageStore,
    | "getConversation"
    | "isConversationMember"
    | "listConversationMembers"
    | "insertMessage"
  > = {
    async getConversation(nextConversationId) {
      return nextConversationId === conversation.id ? conversation : null;
    },
    async isConversationMember(nextConversationId, userId) {
      return members.some(
        (member) =>
          member.conversationId === nextConversationId &&
          member.userId === userId
      );
    },
    async listConversationMembers(nextConversationId) {
      return members.filter(
        (member) => member.conversationId === nextConversationId
      );
    },
    async insertMessage(input) {
      const message: Message = {
        id: `message-${messages.length + 1}`,
        conversationId: input.conversationId,
        senderId: input.senderId,
        senderType: input.senderType,
        body: input.body,
        metadata: input.metadata,
        createdAt: "2026-06-22T08:02:00.000Z",
      };
      messages.push(message);
      return message;
    },
  };

  return {
    conversation,
    members,
    messages,
    reads,
    store: store as MessageStore,
  };
}

function createMember(userId: string): ConversationMember {
  return {
    id: `member-${userId}`,
    conversationId,
    userId,
    role: "member",
    createdAt: "2026-06-22T08:00:00.000Z",
  };
}
