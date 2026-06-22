import type { NotificationRow } from "@/lib/supabase/database.types";
import {
  NOTIFICATION_TYPES,
  type ChemVaultNotification,
  type NotificationMetadata,
  type NotificationType,
} from "./types";

export const notificationTypes = [...NOTIFICATION_TYPES];

export function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  );
}

export function toChemVaultNotification(
  row: NotificationRow
): ChemVaultNotification {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: isNotificationType(row.type) ? row.type : "info",
    source: row.source,
    link: row.link,
    read: row.read,
    metadata: normalizeMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

function normalizeMetadata(value: NotificationRow["metadata"]): NotificationMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as NotificationMetadata;
}
