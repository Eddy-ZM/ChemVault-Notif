import type { Json } from "@/lib/supabase/database.types";

export const NOTIFICATION_TYPES = [
  "info",
  "success",
  "warning",
  "error",
  "message",
  "system",
  "task",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type NotificationSource = string;
export type NotificationMetadata = Record<string, Json>;

export interface ChemVaultNotification {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  type: NotificationType;
  source: NotificationSource | null;
  link: string | null;
  read: boolean;
  metadata: NotificationMetadata;
  createdAt: string;
}

export interface NotificationPayload {
  userId: string;
  title: string;
  body?: string | null;
  type?: NotificationType | string | null;
  source?: NotificationSource | null;
  link?: string | null;
  metadata?: NotificationMetadata | null;
}

export interface NormalizedNotificationPayload {
  userId: string;
  title: string;
  body: string | null;
  type: NotificationType;
  source: NotificationSource | null;
  link: string | null;
  metadata: NotificationMetadata;
}
