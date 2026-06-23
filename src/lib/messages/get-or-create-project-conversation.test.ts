import { describe, expect, it } from "vitest";
import { getOrCreateProjectConversation } from "./get-or-create-project-conversation";
import type { MessageStore } from "./message-store";
import type {
  Conversation,
  ConversationMember,
} from "@/types/messages";

const projectId = "33333333-3333-3333-3333-333333333333";
const userId = "22222222-2222-2222-2222-222222222222";

describe("getOrCreateProjectConversation", () => {
  it("creates a project conversation and owner membership when none exists", async () => {
    const memory = createMemoryMessageStore();

    const conversation = await getOrCreateProjectConversation(
      {
        projectId,
        userId,
        title: "AI Paper Extraction Project",
      },
      { store: memory.store }
    );

    expect(conversation).toMatchObject({
      type: "project",
      projectId,
      title: "AI Paper Extraction Project",
    });
    expect(memory.conversations).toHaveLength(1);
    expect(memory.members).toMatchObject([
      {
        conversationId: conversation.id,
        userId,
        role: "owner",
      },
    ]);
  });

  it("returns an existing project conversation and adds missing membership", async () => {
    const memory = createMemoryMessageStore({
      conversations: [
        createConversation({
          id: "44444444-4444-4444-4444-444444444444",
          projectId,
          title: "Existing Project",
        }),
      ],
    });

    const conversation = await getOrCreateProjectConversation(
      {
        projectId,
        userId,
        title: "Ignored Title",
      },
      { store: memory.store }
    );

    expect(conversation.id).toBe("44444444-4444-4444-4444-444444444444");
    expect(memory.conversations).toHaveLength(1);
    expect(memory.members).toMatchObject([
      {
        conversationId: conversation.id,
        userId,
        role: "member",
      },
    ]);
  });
});

function createConversation(
  overrides: Partial<Conversation> = {}
): Conversation {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    type: "project",
    projectId: null,
    title: null,
    createdAt: "2026-06-22T08:00:00.000Z",
    updatedAt: "2026-06-22T08:00:00.000Z",
    ...overrides,
  };
}

function createMemoryMessageStore({
  conversations = [],
  members = [],
}: {
  conversations?: Conversation[];
  members?: ConversationMember[];
} = {}) {
  const memory = {
    conversations: [...conversations],
    members: [...members],
  };

  const store: Pick<
    MessageStore,
    | "findProjectConversation"
    | "createConversation"
    | "ensureConversationMember"
  > = {
    async findProjectConversation(nextProjectId) {
      return (
        memory.conversations.find(
          (conversation) =>
            conversation.type === "project" &&
            conversation.projectId === nextProjectId
        ) ?? null
      );
    },
    async createConversation(input) {
      const conversation = createConversation({
        id: "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        type: input.type,
        projectId: input.projectId,
        title: input.title,
      });
      memory.conversations.push(conversation);
      return conversation;
    },
    async ensureConversationMember(input) {
      const existing = memory.members.find(
        (member) =>
          member.conversationId === input.conversationId &&
          member.userId === input.userId
      );

      if (existing) {
        return existing;
      }

      const member: ConversationMember = {
        id: `member-${memory.members.length + 1}`,
        conversationId: input.conversationId,
        userId: input.userId,
        role: input.role,
        createdAt: "2026-06-22T08:01:00.000Z",
      };
      memory.members.push(member);
      return member;
    },
  };

  return {
    ...memory,
    store: store as MessageStore,
  };
}
