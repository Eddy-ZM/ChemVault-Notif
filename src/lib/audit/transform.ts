import type {
  AuditLogRow,
  Json,
  ProjectActivityEventRow,
} from "@/lib/supabase/database.types";
import {
  ACTOR_TYPES,
  AUDIT_SEVERITIES,
  AUDIT_VISIBILITIES,
  type ActorType,
  type AuditLog,
  type AuditMetadata,
  type AuditSeverity,
  type AuditVisibility,
  type ProjectActivityEvent,
} from "@/types/audit";

export function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    actorUserId: row.actor_user_id,
    actorType: isActorType(row.actor_type) ? row.actor_type : "user",
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    projectId: row.project_id,
    userId: row.user_id,
    source: row.source,
    severity: isAuditSeverity(row.severity) ? row.severity : "info",
    visibility: isAuditVisibility(row.visibility) ? row.visibility : "admin",
    title: row.title,
    description: row.description,
    metadata: normalizeAuditMetadata(row.metadata),
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

export function toProjectActivityEvent(
  row: ProjectActivityEventRow
): ProjectActivityEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    actorUserId: row.actor_user_id,
    actorType: isActorType(row.actor_type) ? row.actor_type : "user",
    eventType: row.event_type,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    description: row.description,
    visibility: isAuditVisibility(row.visibility) ? row.visibility : "project",
    severity: isAuditSeverity(row.severity) ? row.severity : "info",
    metadata: normalizeAuditMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

export function isActorType(value: unknown): value is ActorType {
  return (
    typeof value === "string" &&
    (ACTOR_TYPES as readonly string[]).includes(value)
  );
}

export function isAuditSeverity(value: unknown): value is AuditSeverity {
  return (
    typeof value === "string" &&
    (AUDIT_SEVERITIES as readonly string[]).includes(value)
  );
}

export function isAuditVisibility(value: unknown): value is AuditVisibility {
  return (
    typeof value === "string" &&
    (AUDIT_VISIBILITIES as readonly string[]).includes(value)
  );
}

export function normalizeAuditMetadata(value: Json): AuditMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as AuditMetadata;
}
