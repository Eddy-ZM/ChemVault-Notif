import { NotificationError } from "@/lib/notifications/errors";
import type { Conversation } from "@/types/messages";
import {
  createSupabaseMessageStore,
  type MessageStore,
} from "./message-store";

interface GetOrCreateProjectConversationInput {
  projectId: string;
  userId: string;
  title?: string | null;
}

interface GetOrCreateProjectConversationDependencies {
  store?: MessageStore;
}

export async function getOrCreateProjectConversation(
  input: GetOrCreateProjectConversationInput,
  dependencies: GetOrCreateProjectConversationDependencies = {}
): Promise<Conversation> {
  const projectId = input.projectId?.trim();
  const userId = input.userId?.trim();

  if (!projectId) {
    throw new NotificationError("projectId is required.", undefined, 400);
  }

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseMessageStore();
  let conversation = await store.findProjectConversation(projectId);
  const created = !conversation;

  if (!conversation) {
    conversation = await store.createConversation({
      type: "project",
      projectId,
      title: normalizeTitle(input.title, projectId),
    });
  }

  await store.ensureConversationMember({
    conversationId: conversation.id,
    userId,
    role: created ? "owner" : "member",
  });

  return conversation;
}

function normalizeTitle(title: string | null | undefined, projectId: string) {
  const trimmed = typeof title === "string" ? title.trim() : "";
  return trimmed || `Project ${projectId}`;
}
