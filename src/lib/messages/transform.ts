import type {
  ConversationMemberRow,
  ConversationRow,
  Json,
  MessageReadRow,
  MessageRow,
} from "@/lib/supabase/database.types";
import {
  CONVERSATION_MEMBER_ROLES,
  CONVERSATION_TYPES,
  MESSAGE_SENDER_TYPES,
  type Conversation,
  type ConversationMember,
  type ConversationMemberRole,
  type ConversationType,
  type Message,
  type MessageMetadata,
  type MessageRead,
  type MessageSenderType,
} from "@/types/messages";

export function isConversationType(value: unknown): value is ConversationType {
  return (
    typeof value === "string" &&
    (CONVERSATION_TYPES as readonly string[]).includes(value)
  );
}

export function isConversationMemberRole(
  value: unknown
): value is ConversationMemberRole {
  return (
    typeof value === "string" &&
    (CONVERSATION_MEMBER_ROLES as readonly string[]).includes(value)
  );
}

export function isMessageSenderType(
  value: unknown
): value is MessageSenderType {
  return (
    typeof value === "string" &&
    (MESSAGE_SENDER_TYPES as readonly string[]).includes(value)
  );
}

export function toConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    type: isConversationType(row.type) ? row.type : "project",
    projectId: row.project_id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toConversationMember(
  row: ConversationMemberRow
): ConversationMember {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    userId: row.user_id,
    role: isConversationMemberRole(row.role) ? row.role : "member",
    createdAt: row.created_at,
  };
}

export function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    senderType: isMessageSenderType(row.sender_type)
      ? row.sender_type
      : "user",
    body: row.body,
    metadata: normalizeMessageMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

export function toMessageRead(row: MessageReadRow): MessageRead {
  return {
    id: row.id,
    messageId: row.message_id,
    userId: row.user_id,
    readAt: row.read_at,
  };
}

export function normalizeMessageMetadata(value: Json): MessageMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as MessageMetadata;
}
