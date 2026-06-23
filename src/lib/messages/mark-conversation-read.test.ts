import { describe, expect, it } from "vitest";
import { markConversationRead } from "./mark-conversation-read";
import type { MessageStore } from "./message-store";
import type {
  ConversationMember,
  Message,
  MessageRead,
} from "@/types/messages";

const conversationId = "11111111-1111-1111-1111-111111111111";
const userId = "22222222-2222-2222-2222-222222222222";

describe("markConversationRead", () => {
  it("marks unread conversation messages without duplicating existing read rows", async () => {
    const messages = [
      createMessage("message-1"),
      createMessage("message-2"),
      createMessage("message-3"),
    ];
    const reads: MessageRead[] = [
      {
        id: "read-1",
        messageId: "message-2",
        userId,
        readAt: "2026-06-22T08:03:00.000Z",
      },
    ];
    const members: ConversationMember[] = [
      {
        id: "member-1",
        conversationId,
        userId,
        role: "member",
        createdAt: "2026-06-22T08:00:00.000Z",
      },
    ];

    const inserted: Array<{ messageId: string; userId: string }> = [];
    const store: Pick<
      MessageStore,
      | "isConversationMember"
      | "listConversationMessages"
      | "listReadMessageIds"
      | "insertMessageReads"
    > = {
      async isConversationMember(nextConversationId, nextUserId) {
        return members.some(
          (member) =>
            member.conversationId === nextConversationId &&
            member.userId === nextUserId
        );
      },
      async listConversationMessages(nextConversationId) {
        return messages.filter(
          (message) => message.conversationId === nextConversationId
        );
      },
      async listReadMessageIds(messageIds, nextUserId) {
        return new Set(
          reads
            .filter(
              (read) =>
                read.userId === nextUserId &&
                messageIds.includes(read.messageId)
            )
            .map((read) => read.messageId)
        );
      },
      async insertMessageReads(rows) {
        inserted.push(...rows);
        return rows.length;
      },
    };

    const result = await markConversationRead(
      {
        conversationId,
        userId,
      },
      { store: store as MessageStore }
    );

    expect(result.insertedCount).toBe(2);
    expect(inserted).toEqual([
      { messageId: "message-1", userId },
      { messageId: "message-3", userId },
    ]);
  });
});

function createMessage(id: string): Message {
  return {
    id,
    conversationId,
    senderId: "33333333-3333-3333-3333-333333333333",
    senderType: "user",
    body: "Message body",
    metadata: {},
    createdAt: "2026-06-22T08:02:00.000Z",
  };
}
