import { NotificationError } from "@/lib/notifications/errors";
import {
  createSupabaseMessageStore,
  type MessageStore,
} from "./message-store";

interface MarkConversationReadInput {
  conversationId: string;
  userId: string;
}

interface MarkConversationReadDependencies {
  store?: MessageStore;
}

export async function markConversationRead(
  input: MarkConversationReadInput,
  dependencies: MarkConversationReadDependencies = {}
): Promise<{ insertedCount: number }> {
  const conversationId = input.conversationId?.trim();
  const userId = input.userId?.trim();

  if (!conversationId) {
    throw new NotificationError("conversationId is required.", undefined, 400);
  }

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseMessageStore();
  const isMember = await store.isConversationMember(conversationId, userId);

  if (!isMember) {
    throw new NotificationError(
      "User must be a conversation member.",
      undefined,
      403
    );
  }

  const messages = await store.listConversationMessages(conversationId);
  const messageIds = messages.map((message) => message.id);
  const readMessageIds = await store.listReadMessageIds(messageIds, userId);
  const unreadRows = messageIds
    .filter((messageId) => !readMessageIds.has(messageId))
    .map((messageId) => ({
      messageId,
      userId,
    }));

  const insertedCount = await store.insertMessageReads(unreadRows);
  return { insertedCount };
}
