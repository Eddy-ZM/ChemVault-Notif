import type { Json } from "@/lib/supabase/database.types";

export const USER_SEGMENT_TYPES = ["manual", "dynamic"] as const;
export const BROADCAST_STATUSES = [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
  "cancelled",
] as const;
export const BROADCAST_TARGET_TYPES = [
  "single_user",
  "selected_users",
  "project_members",
  "segment",
  "all_users",
] as const;
export const BROADCAST_RECIPIENT_STATUSES = [
  "pending",
  "sent",
  "failed",
  "skipped",
] as const;

export type UserSegmentType = (typeof USER_SEGMENT_TYPES)[number];
export type BroadcastStatus = (typeof BROADCAST_STATUSES)[number];
export type BroadcastTargetType = (typeof BROADCAST_TARGET_TYPES)[number];
export type BroadcastRecipientStatus =
  (typeof BROADCAST_RECIPIENT_STATUSES)[number];
export type BroadcastJson = Record<string, Json>;

export interface UserSegment {
  id: string;
  name: string;
  description: string | null;
  type: UserSegmentType;
  criteria: BroadcastJson;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSegmentMember {
  id: string;
  segmentId: string;
  userId: string;
  addedBy: string | null;
  createdAt: string;
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  ignorePreferences: boolean;
  type: string;
  source: string;
  link: string | null;
  targetType: BroadcastTargetType;
  targetPayload: BroadcastJson;
  recipientCount: number;
  status: BroadcastStatus;
  createdBy: string | null;
  sentBy: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface BroadcastRecipient {
  id: string;
  broadcastId: string;
  userId: string;
  notificationId: string | null;
  status: BroadcastRecipientStatus;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface BroadcastAuditLog {
  id: string;
  broadcastId: string;
  actorId: string | null;
  action: string;
  metadata: BroadcastJson;
  createdAt: string;
}

export interface BroadcastSummary {
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
}
