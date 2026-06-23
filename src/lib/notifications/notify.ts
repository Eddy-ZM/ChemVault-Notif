import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { NotificationError } from "./errors";
import { sendWebPushToUser } from "./send-web-push";
import {
  mapNotificationToCategory,
  getNotificationPreference,
} from "./preferences";
import {
  isNotificationType,
  toChemVaultNotification,
} from "./transform";
import {
  NOTIFICATION_PREFERENCE_DEFAULTS,
  type NotificationCategory,
  type NotificationChannel,
} from "@/types/notification-preferences";
import type { AuditSeverity } from "@/types/audit";
import type {
  ChemVaultNotification,
  NormalizedNotificationPayload,
  NotificationMetadata,
  NotificationPayload,
} from "./types";

export async function notify(
  payload: NotificationPayload
): Promise<ChemVaultNotification | null> {
  const normalized = validateNotificationPayload(payload);
  const supabase = createSupabaseAdminClient();
  const category = mapNotificationToCategory(normalized);
  const ignorePreferences =
    normalized.metadata.ignorePreferences === true ||
    normalized.metadata.ignoreNotificationPreferences === true;

  const { canCreateInApp, canSendPush } = await resolveNotificationChannels(
    normalized.userId,
    category,
    ignorePreferences
  );

  if (!canCreateInApp && !canSendPush) {
    await logNotificationSkipped({
      normalized,
      category,
      canCreateInApp,
      canSendPush,
    });
    return null;
  }

  let notification: ChemVaultNotification | null = null;
  let notificationId: string | null = null;

  if (canCreateInApp) {
    const insertPayload = {
      user_id: normalized.userId,
      title: normalized.title,
      body: normalized.body,
      type: normalized.type,
      source: normalized.source,
      link: normalized.link,
      metadata: sanitizedMetadata(normalized.metadata),
    };

    const { data, error } = await supabase
      .from("notifications")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error || !data) {
      throw new NotificationError("Failed to create notification.", error);
    }

    notification = toChemVaultNotification(data);
    notificationId = notification.id;

    const { error: eventError } = await supabase
      .from("notification_events")
      .insert({
        notification_id: notificationId,
        user_id: normalized.userId,
        event_type: "created",
        metadata: normalized.metadata,
      });

    if (eventError) {
      await supabase.from("notifications").delete().eq("id", notificationId);
      throw new NotificationError(
        "Failed to record notification creation event.",
        eventError
      );
    }

    await logAuditEvent({
      action: "notification.created",
      entityType: "notification",
      entityId: notification.id,
      projectId: uuidFromMetadata(normalized.metadata.projectId),
      userId: normalized.userId,
      source: normalized.source,
      severity: severityFromNotificationType(normalized.type),
      visibility: "admin",
      title: "Notification created",
      description: normalized.title,
      metadata: {
        category,
        notificationType: normalized.type,
        source: normalized.source,
        link: normalized.link,
        pushPreviewAllowed: normalized.metadata.pushPreviewAllowed === true,
      },
    });
  }

  if (canSendPush) {
    try {
      await sendWebPushToUser({
        userId: normalized.userId,
        title: normalized.title,
        body: normalized.body,
        link: normalized.link ?? "/notifications",
        notificationId: notificationId ?? undefined,
        previewAllowed: normalized.metadata.pushPreviewAllowed === true,
      });
    } catch {
      // Web Push is a progressive enhancement. In-app notifications remain authoritative.
    }
  }

  return notification;
}

async function logNotificationSkipped({
  normalized,
  category,
  canCreateInApp,
  canSendPush,
}: {
  normalized: NormalizedNotificationPayload;
  category: NotificationCategory;
  canCreateInApp: boolean;
  canSendPush: boolean;
}) {
  await logAuditEvent({
    action: "notification.skipped",
    entityType: "notification",
    projectId: uuidFromMetadata(normalized.metadata.projectId),
    userId: normalized.userId,
    source: normalized.source,
    severity: "info",
    visibility: "admin",
    title: "Notification skipped",
    description: "Notification preferences disabled all delivery channels.",
    metadata: {
      category,
      notificationType: normalized.type,
      canCreateInApp,
      canSendPush,
      reason: "preferences_disabled",
    },
  });
}

function sanitizedMetadata(metadata: NotificationMetadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const copy: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (key === "ignorePreferences" || key === "ignoreNotificationPreferences") {
      continue;
    }

    copy[key] = value;
  }

  return copy as NotificationMetadata;
}

async function resolveNotificationChannels(
  userId: string,
  category: NotificationCategory,
  ignorePreferences: boolean
): Promise<{ canCreateInApp: boolean; canSendPush: boolean }> {
  if (ignorePreferences) {
    return { canCreateInApp: true, canSendPush: true };
  }

  try {
    const [inAppEnabled, pushEnabled] = await Promise.all([
      getNotificationPreference({
        userId,
        category,
        channel: "in_app",
      }),
      getNotificationPreference({
        userId,
        category,
        channel: "web_push",
      }),
    ]);

    return {
      canCreateInApp: inAppEnabled,
      canSendPush: pushEnabled,
    };
  } catch {
    const defaults =
      NOTIFICATION_PREFERENCE_DEFAULTS[category] ||
      ({ in_app: true, web_push: false } satisfies Record<NotificationChannel, boolean>);

    return {
      canCreateInApp: defaults.in_app,
      canSendPush: defaults.web_push,
    };
  }
}

export function validateNotificationPayload(
  payload: NotificationPayload
): NormalizedNotificationPayload {
  const userId = payload.userId?.trim();
  const title = payload.title?.trim();

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  if (!title) {
    throw new NotificationError("title is required.", undefined, 400);
  }

  const type = payload.type?.trim() || "info";

  if (!isNotificationType(type)) {
    throw new NotificationError(
      `Unsupported notification type: ${type}.`,
      undefined,
      400
    );
  }

  return {
    userId,
    title,
    body: normalizeOptionalString(payload.body),
    type,
    source: normalizeOptionalString(payload.source),
    link: normalizeOptionalString(payload.link),
    metadata: normalizeMetadata(payload.metadata),
  };
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeMetadata(
  metadata: NotificationMetadata | null | undefined
): NotificationMetadata {
  if (!metadata || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}

function severityFromNotificationType(type: string): AuditSeverity {
  switch (type) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "error";
    default:
      return "info";
  }
}

function uuidFromMetadata(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    trimmed
  )
    ? trimmed
    : null;
}
