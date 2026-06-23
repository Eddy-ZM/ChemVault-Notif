import { describe, expect, it } from "vitest";
import { sendBroadcast, type BroadcastSenderStore } from "./send-broadcast";
import type { ChemVaultNotification } from "@/lib/notifications/types";
import type {
  Broadcast,
  BroadcastAuditLog,
  BroadcastRecipient,
} from "@/types/broadcasts";

const broadcastId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const actorId = "99999999-9999-4999-8999-999999999999";
const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const userC = "33333333-3333-4333-8333-333333333333";

describe("sendBroadcast", () => {
  it("sends draft broadcasts, skips already sent recipients, and records failures", async () => {
    const memory = createMemoryBroadcastStore();
    const notifiedUsers: string[] = [];

    const summary = await sendBroadcast(
      {
        broadcastId,
        actorId,
      },
      {
        store: memory.store,
        notifyFn: async (payload) => {
          notifiedUsers.push(payload.userId);

          if (payload.userId === userC) {
            throw new Error("Push provider timeout.");
          }

          return {
            id: `notification-${payload.userId}`,
            userId: payload.userId,
            title: payload.title,
            body: payload.body ?? null,
            type: "system",
            source: payload.source ?? "admin",
            link: payload.link ?? null,
            read: false,
            metadata: payload.metadata ?? {},
            createdAt: "2026-06-22T08:30:00.000Z",
          } satisfies ChemVaultNotification;
        },
      }
    );

    expect(summary).toEqual({
      recipientCount: 3,
      sentCount: 1,
      failedCount: 1,
      skippedCount: 1,
    });
    expect(notifiedUsers).toEqual([userB, userC]);
    expect(memory.statuses).toEqual(["sending", "failed"]);
    expect(memory.recipients).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: userA,
          status: "sent",
        }),
        expect.objectContaining({
          userId: userB,
          status: "sent",
          notificationId: `notification-${userB}`,
        }),
        expect.objectContaining({
          userId: userC,
          status: "failed",
          errorMessage: "Push provider timeout.",
        }),
      ])
    );
    expect(memory.auditLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "send_started" }),
        expect.objectContaining({ action: "send_failed" }),
      ])
    );
  });

  it("rejects sent broadcasts", async () => {
    const memory = createMemoryBroadcastStore({
      broadcast: createBroadcast({ status: "sent" }),
    });

    await expect(
      sendBroadcast({ broadcastId, actorId }, { store: memory.store })
    ).rejects.toThrow("draft or scheduled");
  });
});

function createMemoryBroadcastStore({
  broadcast = createBroadcast(),
  recipients = [
    createRecipient({
      userId: userA,
      status: "sent",
      notificationId: "notification-existing",
      sentAt: "2026-06-22T08:00:00.000Z",
    }),
  ],
}: {
  broadcast?: Broadcast;
  recipients?: BroadcastRecipient[];
} = {}) {
  const memory = {
    broadcast,
    recipients: [...recipients],
    auditLogs: [] as BroadcastAuditLog[],
    statuses: [] as Broadcast["status"][],
  };

  const store: BroadcastSenderStore = {
    async getBroadcast(nextBroadcastId) {
      return nextBroadcastId === memory.broadcast.id ? memory.broadcast : null;
    },
    async resolveRecipients() {
      return [userA, userB, userC];
    },
    async ensureBroadcastRecipients(nextBroadcastId, userIds) {
      for (const userId of userIds) {
        const exists = memory.recipients.some(
          (recipient) =>
            recipient.broadcastId === nextBroadcastId &&
            recipient.userId === userId
        );

        if (!exists) {
          memory.recipients.push(createRecipient({ userId }));
        }
      }

      return memory.recipients.filter(
        (recipient) => recipient.broadcastId === nextBroadcastId
      );
    },
    async updateBroadcastStatus(_nextBroadcastId, update) {
      memory.statuses.push(update.status);
      memory.broadcast = {
        ...memory.broadcast,
        status: update.status,
        sentAt: update.sentAt ?? memory.broadcast.sentAt,
        recipientCount:
          update.recipientCount ?? memory.broadcast.recipientCount,
        sentBy: update.sentBy ?? memory.broadcast.sentBy,
      };
      return memory.broadcast;
    },
    async updateBroadcastRecipient(_recipientId, update) {
      const recipientIndex = memory.recipients.findIndex(
        (recipient) => recipient.id === _recipientId
      );

      if (recipientIndex === -1) {
        return;
      }

      const recipient = memory.recipients[recipientIndex];
      memory.recipients[recipientIndex] = {
        ...recipient,
        status: update.status,
        notificationId: update.notificationId ?? recipient.notificationId,
        errorMessage: update.errorMessage ?? recipient.errorMessage,
        sentAt: update.sentAt ?? recipient.sentAt,
      };
    },
    async insertAuditLog(input) {
      memory.auditLogs.push({
        id: `audit-${memory.auditLogs.length + 1}`,
        broadcastId: input.broadcastId,
        actorId: input.actorId ?? null,
        action: input.action,
        metadata: input.metadata ?? {},
        createdAt: "2026-06-22T08:30:00.000Z",
      });
    },
  };

  return {
    ...memory,
    store,
  };
}

function createBroadcast(overrides: Partial<Broadcast> = {}): Broadcast {
  return {
    id: broadcastId,
    title: "Scheduled maintenance",
    body: "ChemVault will be unavailable tonight.",
    type: "system",
    source: "admin",
    link: "/notifications",
    targetType: "selected_users",
    targetPayload: {
      userIds: [userA, userB, userC],
    },
    ignorePreferences: false,
    recipientCount: 0,
    status: "draft",
    createdBy: actorId,
    sentBy: null,
    createdAt: "2026-06-22T08:00:00.000Z",
    sentAt: null,
    ...overrides,
  };
}

function createRecipient(
  overrides: Partial<BroadcastRecipient> = {}
): BroadcastRecipient {
  return {
    id: `recipient-${overrides.userId ?? "unknown"}`,
    broadcastId,
    userId: overrides.userId ?? userA,
    notificationId: null,
    status: "pending",
    errorMessage: null,
    createdAt: "2026-06-22T08:00:00.000Z",
    sentAt: null,
    ...overrides,
  };
}
