import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ConversationInsert,
  Database,
  Json,
  MessageInsert,
  MessageReadInsert,
} from "@/lib/supabase/database.types";
import type {
  Conversation,
  ConversationMember,
  ConversationMemberRole,
  ConversationSummary,
  ConversationType,
  Message,
  MessageMetadata,
  MessageSenderType,
} from "@/types/messages";
import {
  toConversation,
  toConversationMember,
  toMessage,
} from "./transform";

export interface CreateConversationRecordInput {
  type: ConversationType;
  projectId?: string | null;
  title?: string | null;
}

export interface EnsureConversationMemberInput {
  conversationId: string;
  userId: string;
  role: ConversationMemberRole;
}

export interface InsertMessageRecordInput {
  conversationId: string;
  senderId: string | null;
  senderType: MessageSenderType;
  body: string;
  metadata: MessageMetadata;
}

export interface MessageStore {
  findProjectConversation(projectId: string): Promise<Conversation | null>;
  createConversation(
    input: CreateConversationRecordInput
  ): Promise<Conversation>;
  ensureConversationMember(
    input: EnsureConversationMemberInput
  ): Promise<ConversationMember>;
  getConversation(conversationId: string): Promise<Conversation | null>;
  isConversationMember(
    conversationId: string,
    userId: string
  ): Promise<boolean>;
  listConversationMembers(
    conversationId: string
  ): Promise<ConversationMember[]>;
  listConversationMessages(conversationId: string): Promise<Message[]>;
  listReadMessageIds(
    messageIds: string[],
    userId: string
  ): Promise<Set<string>>;
  insertMessage(input: InsertMessageRecordInput): Promise<Message>;
  insertMessageReads(
    rows: Array<{ messageId: string; userId: string }>
  ): Promise<number>;
  listConversationSummaries(userId: string): Promise<ConversationSummary[]>;
}

export function createSupabaseMessageStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): MessageStore {
  return {
    async findProjectConversation(projectId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("type", "project")
        .eq("project_id", projectId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toConversation(data) : null;
    },

    async createConversation(input) {
      const insert: ConversationInsert = {
        type: input.type,
        project_id: input.projectId ?? null,
        title: input.title ?? null,
      };
      const { data, error } = await supabase
        .from("conversations")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create conversation.");
      }

      return toConversation(data);
    },

    async ensureConversationMember(input) {
      const { data: existing, error: selectError } = await supabase
        .from("conversation_members")
        .select("*")
        .eq("conversation_id", input.conversationId)
        .eq("user_id", input.userId)
        .maybeSingle();

      if (selectError) {
        throw selectError;
      }

      if (existing) {
        return toConversationMember(existing);
      }

      const { data, error } = await supabase
        .from("conversation_members")
        .insert({
          conversation_id: input.conversationId,
          user_id: input.userId,
          role: input.role,
        })
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to add conversation member.");
      }

      return toConversationMember(data);
    },

    async getConversation(conversationId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toConversation(data) : null;
    },

    async isConversationMember(conversationId, userId) {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("id")
        .eq("conversation_id", conversationId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return Boolean(data);
    },

    async listConversationMembers(conversationId) {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toConversationMember);
    },

    async listConversationMessages(conversationId) {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toMessage);
    },

    async listReadMessageIds(messageIds, userId) {
      if (messageIds.length === 0) {
        return new Set();
      }

      const { data, error } = await supabase
        .from("message_reads")
        .select("message_id")
        .eq("user_id", userId)
        .in("message_id", messageIds);

      if (error) {
        throw error;
      }

      return new Set((data ?? []).map((row) => row.message_id));
    },

    async insertMessage(input) {
      const insert: MessageInsert = {
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        sender_type: input.senderType,
        body: input.body,
        metadata: input.metadata as Json,
      };
      const { data, error } = await supabase
        .from("messages")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create message.");
      }

      const { error: updateError } = await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", input.conversationId);

      if (updateError) {
        throw updateError;
      }

      return toMessage(data);
    },

    async insertMessageReads(rows) {
      if (rows.length === 0) {
        return 0;
      }

      const insertRows: MessageReadInsert[] = rows.map((row) => ({
        message_id: row.messageId,
        user_id: row.userId,
      }));
      const { data, error } = await supabase
        .from("message_reads")
        .upsert(insertRows, {
          onConflict: "message_id,user_id",
          ignoreDuplicates: true,
        })
        .select("id");

      if (error) {
        throw error;
      }

      return data?.length ?? 0;
    },

    async listConversationSummaries(userId) {
      const { data: memberships, error: memberError } = await supabase
        .from("conversation_members")
        .select("conversation_id")
        .eq("user_id", userId);

      if (memberError) {
        throw memberError;
      }

      const conversationIds = [
        ...new Set((memberships ?? []).map((member) => member.conversation_id)),
      ];

      if (conversationIds.length === 0) {
        return [];
      }

      const [{ data: conversationRows, error: conversationsError }, { data: messageRows, error: messagesError }] =
        await Promise.all([
          supabase
            .from("conversations")
            .select("*")
            .in("id", conversationIds),
          supabase
            .from("messages")
            .select("*")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false }),
        ]);

      if (conversationsError) {
        throw conversationsError;
      }

      if (messagesError) {
        throw messagesError;
      }

      const messages = (messageRows ?? []).map(toMessage);
      const messageIds = messages.map((message) => message.id);
      const readMessageIds = await this.listReadMessageIds(messageIds, userId);
      const conversations = (conversationRows ?? []).map(toConversation);

      return conversations
        .map((conversation) => {
          const conversationMessages = messages.filter(
            (message) => message.conversationId === conversation.id
          );
          const latestMessage = conversationMessages[0] ?? null;
          const unreadCount = conversationMessages.filter(
            (message) =>
              message.senderId !== userId && !readMessageIds.has(message.id)
          ).length;

          return {
            conversation,
            latestMessage,
            unreadCount,
            latestActivityAt: latestMessage?.createdAt ?? conversation.updatedAt,
          };
        })
        .sort(
          (a, b) =>
            new Date(b.latestActivityAt).getTime() -
            new Date(a.latestActivityAt).getTime()
        );
    },
  };
}
