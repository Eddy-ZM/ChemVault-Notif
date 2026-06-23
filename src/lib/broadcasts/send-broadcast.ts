import { notify } from "@/lib/notifications/notify";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import type {
  ChemVaultNotification,
  NotificationPayload,
} from "@/lib/notifications/types";
import { NotificationError } from "@/lib/notifications/errors";
import type {
  Broadcast,
  BroadcastJson,
  BroadcastRecipient,
  BroadcastSummary,
} from "@/types/broadcasts";
import {
  createSupabaseBroadcastStore,
  type BroadcastStatusUpdate,
  type BroadcastStore,
} from "./broadcast-store";

interface SendBroadcastInput {
  broadcastId: string;
  actorId: string;
}

export type BroadcastSenderStore = Pick<
  BroadcastStore,
  | "getBroadcast"
  | "resolveRecipients"
  | "ensureBroadcastRecipients"
  | "updateBroadcastStatus"
  | "updateBroadcastRecipient"
  | "insertAuditLog"
>;

interface SendBroadcastDependencies {
  store?: BroadcastSenderStore;
  notifyFn?: (
    payload: NotificationPayload
  ) => Promise<ChemVaultNotification | null>;
}

export async function sendBroadcast(
  input: SendBroadcastInput,
  dependencies: SendBroadcastDependencies = {}
): Promise<BroadcastSummary> {
  const store = dependencies.store ?? createSupabaseBroadcastStore();
  const notifyFn = dependencies.notifyFn ?? notify;
  const broadcast = await store.getBroadcast(input.broadcastId);

  if (!broadcast) {
    throw new NotificationError("Broadcast not found.", undefined, 404);
  }

  if (broadcast.status !== "draft" && broadcast.status !== "scheduled") {
    throw new NotificationError(
      "Broadcast must be draft or scheduled before sending.",
      undefined,
      400
    );
  }

  const recipientUserIds = await store.resolveRecipients(
    broadcast.targetType,
    broadcast.targetPayload
  );
  await store.insertAuditLog({
    broadcastId: broadcast.id,
    actorId: input.actorId,
    action: "send_started",
    metadata: {
      recipientCount: recipientUserIds.length,
      targetType: broadcast.targetType,
    },
  });
  await store.updateBroadcastStatus(broadcast.id, {
    status: "sending",
    recipientCount: recipientUserIds.length,
    sentBy: input.actorId,
  });

  const recipients = await store.ensureBroadcastRecipients(
    broadcast.id,
    recipientUserIds
  );
  const summary = await sendToRecipients({
    broadcast,
    recipients,
    notifyFn,
    store,
  });
  const finalStatus = summary.failedCount > 0 ? "failed" : "sent";
  const sentAt = new Date().toISOString();

  await store.updateBroadcastStatus(broadcast.id, {
    status: finalStatus,
    sentAt,
    recipientCount: recipientUserIds.length,
  } satisfies BroadcastStatusUpdate);
  await store.insertAuditLog({
    broadcastId: broadcast.id,
    actorId: input.actorId,
    action: finalStatus === "sent" ? "send_completed" : "send_failed",
    metadata: summary as unknown as BroadcastJson,
  });
  await logAuditEvent({
    actorUserId: input.actorId,
    actorType: "admin",
    action: finalStatus === "sent" ? "broadcast.sent" : "broadcast.failed",
    entityType: "broadcast",
    entityId: broadcast.id,
    source: broadcast.source,
    severity: finalStatus === "sent" ? "success" : "error",
    visibility: "admin",
    title: finalStatus === "sent" ? "Broadcast sent" : "Broadcast failed",
    description: broadcast.title,
    metadata: {
      broadcastId: broadcast.id,
      targetType: broadcast.targetType,
      recipientCount: summary.recipientCount,
      sentCount: summary.sentCount,
      failedCount: summary.failedCount,
      skippedCount: summary.skippedCount,
    },
  });

  return summary;
}

async function sendToRecipients({
  broadcast,
  recipients,
  notifyFn,
  store,
}: {
  broadcast: Broadcast;
  recipients: BroadcastRecipient[];
  notifyFn: (payload: NotificationPayload) => Promise<ChemVaultNotification | null>;
  store: BroadcastSenderStore;
}): Promise<BroadcastSummary> {
  const summary: BroadcastSummary = {
    recipientCount: recipients.length,
    sentCount: 0,
    failedCount: 0,
    skippedCount: 0,
  };

  for (const recipient of recipients) {
    if (recipient.status === "sent") {
      summary.skippedCount += 1;
      continue;
    }

    try {
      const notification = await notifyFn(
        toNotificationPayload(broadcast, recipient.userId)
      );

      if (!notification) {
        await store.updateBroadcastRecipient(recipient.id, {
          status: "skipped",
          notificationId: null,
          errorMessage: null,
          sentAt: new Date().toISOString(),
        });
        summary.skippedCount += 1;
        continue;
      }

      await store.updateBroadcastRecipient(recipient.id, {
        status: "sent",
        notificationId: notification.id,
        errorMessage: null,
        sentAt: new Date().toISOString(),
      });
      summary.sentCount += 1;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send notification.";
      await store.updateBroadcastRecipient(recipient.id, {
        status: "failed",
        errorMessage,
      });
      summary.failedCount += 1;
    }
  }

  return summary;
}

function toNotificationPayload(
  broadcast: Broadcast,
  userId: string
): NotificationPayload {
  return {
    userId,
    title: broadcast.title,
    body: broadcast.body,
    type: broadcast.type,
    source: broadcast.source,
    link: broadcast.link,
    metadata: {
      broadcastId: broadcast.id,
      pushPreviewAllowed: broadcast.targetPayload.pushPreviewAllowed === true,
      ignoreNotificationPreferences:
        broadcast.ignorePreferences === true ||
        broadcast.targetPayload.ignoreNotificationPreferences === true,
    },
  };
}
