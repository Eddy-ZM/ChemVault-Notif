import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { NotificationInsert } from "@/lib/supabase/database.types";
import { NotificationError } from "./errors";
import { isNotificationType, toChemVaultNotification } from "./transform";
import type {
  ChemVaultNotification,
  NormalizedNotificationPayload,
  NotificationMetadata,
  NotificationPayload,
} from "./types";

export async function notify(
  payload: NotificationPayload
): Promise<ChemVaultNotification> {
  const normalized = validateNotificationPayload(payload);
  const supabase = createSupabaseAdminClient();

  const insertPayload: NotificationInsert = {
    user_id: normalized.userId,
    title: normalized.title,
    body: normalized.body,
    type: normalized.type,
    source: normalized.source,
    link: normalized.link,
    metadata: normalized.metadata,
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    throw new NotificationError("Failed to create notification.", error);
  }

  const { error: eventError } = await supabase
    .from("notification_events")
    .insert({
      notification_id: data.id,
      user_id: normalized.userId,
      event_type: "created",
      metadata: normalized.metadata,
    });

  if (eventError) {
    await supabase.from("notifications").delete().eq("id", data.id);
    throw new NotificationError(
      "Failed to record notification creation event.",
      eventError
    );
  }

  return toChemVaultNotification(data);
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
