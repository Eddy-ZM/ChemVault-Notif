import type { Json } from "@/lib/supabase/database.types";

export const CONVERSATION_TYPES = ["project", "support", "system"] as const;
export const CONVERSATION_MEMBER_ROLES = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const;
export const MESSAGE_SENDER_TYPES = [
  "user",
  "admin",
  "system",
  "ai",
  "task",
] as const;

export type ConversationType = (typeof CONVERSATION_TYPES)[number];
export type ConversationMemberRole =
  (typeof CONVERSATION_MEMBER_ROLES)[number];
export type MessageSenderType = (typeof MESSAGE_SENDER_TYPES)[number];
export type MessageMetadata = Record<string, Json>;

export interface Conversation {
  id: string;
  type: ConversationType;
  projectId: string | null;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMember {
  id: string;
  conversationId: string;
  userId: string;
  role: ConversationMemberRole;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderType: MessageSenderType;
  body: string;
  metadata: MessageMetadata;
  createdAt: string;
}

export interface MessageRead {
  id: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface CreateMessageInput {
  conversationId: string;
  senderId?: string | null;
  senderType?: MessageSenderType;
  body: string;
  metadata?: MessageMetadata | null;
}

export interface ConversationSummary {
  conversation: Conversation;
  latestMessage: Message | null;
  unreadCount: number;
  latestActivityAt: string;
}
