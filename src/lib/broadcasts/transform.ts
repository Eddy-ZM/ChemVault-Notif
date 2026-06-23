import type {
  BroadcastAuditLogRow,
  BroadcastRecipientRow,
  BroadcastRow,
  Json,
  UserSegmentMemberRow,
  UserSegmentRow,
} from "@/lib/supabase/database.types";
import {
  BROADCAST_RECIPIENT_STATUSES,
  BROADCAST_STATUSES,
  BROADCAST_TARGET_TYPES,
  USER_SEGMENT_TYPES,
  type Broadcast,
  type BroadcastAuditLog,
  type BroadcastJson,
  type BroadcastRecipient,
  type BroadcastRecipientStatus,
  type BroadcastStatus,
  type BroadcastTargetType,
  type UserSegment,
  type UserSegmentMember,
  type UserSegmentType,
} from "@/types/broadcasts";

export function isBroadcastTargetType(
  value: unknown
): value is BroadcastTargetType {
  return (
    typeof value === "string" &&
    (BROADCAST_TARGET_TYPES as readonly string[]).includes(value)
  );
}

export function isBroadcastStatus(value: unknown): value is BroadcastStatus {
  return (
    typeof value === "string" &&
    (BROADCAST_STATUSES as readonly string[]).includes(value)
  );
}

export function toUserSegment(row: UserSegmentRow): UserSegment {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: isUserSegmentType(row.type) ? row.type : "manual",
    criteria: normalizeBroadcastJson(row.criteria),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toUserSegmentMember(
  row: UserSegmentMemberRow
): UserSegmentMember {
  return {
    id: row.id,
    segmentId: row.segment_id,
    userId: row.user_id,
    addedBy: row.added_by,
    createdAt: row.created_at,
  };
}

export function toBroadcast(row: BroadcastRow): Broadcast {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    ignorePreferences: row.ignore_preferences ?? false,
    type: row.type,
    source: row.source,
    link: row.link,
    targetType: isBroadcastTargetType(row.target_type)
      ? row.target_type
      : "selected_users",
    targetPayload: normalizeBroadcastJson(row.target_payload),
    recipientCount: row.recipient_count,
    status: isBroadcastStatus(row.status) ? row.status : "draft",
    createdBy: row.created_by,
    sentBy: row.sent_by,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  };
}

export function toBroadcastRecipient(
  row: BroadcastRecipientRow
): BroadcastRecipient {
  return {
    id: row.id,
    broadcastId: row.broadcast_id,
    userId: row.user_id,
    notificationId: row.notification_id,
    status: isBroadcastRecipientStatus(row.status) ? row.status : "pending",
    errorMessage: row.error_message,
    createdAt: row.created_at,
    sentAt: row.sent_at,
  };
}

export function toBroadcastAuditLog(
  row: BroadcastAuditLogRow
): BroadcastAuditLog {
  return {
    id: row.id,
    broadcastId: row.broadcast_id,
    actorId: row.actor_id,
    action: row.action,
    metadata: normalizeBroadcastJson(row.metadata),
    createdAt: row.created_at,
  };
}

export function normalizeBroadcastJson(value: Json): BroadcastJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as BroadcastJson;
}

function isUserSegmentType(value: unknown): value is UserSegmentType {
  return (
    typeof value === "string" &&
    (USER_SEGMENT_TYPES as readonly string[]).includes(value)
  );
}

function isBroadcastRecipientStatus(
  value: unknown
): value is BroadcastRecipientStatus {
  return (
    typeof value === "string" &&
    (BROADCAST_RECIPIENT_STATUSES as readonly string[]).includes(value)
  );
}
