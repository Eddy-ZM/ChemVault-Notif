import type { Json } from "@/lib/supabase/database.types";

export const ACTOR_TYPES = [
  "user",
  "admin",
  "system",
  "ai",
  "service",
  "webhook",
] as const;

export const AUDIT_SEVERITIES = [
  "debug",
  "info",
  "success",
  "warning",
  "error",
  "critical",
] as const;

export const AUDIT_VISIBILITIES = ["admin", "project", "private"] as const;

export type ActorType = (typeof ACTOR_TYPES)[number];
export type AuditSeverity = (typeof AUDIT_SEVERITIES)[number];
export type AuditVisibility = (typeof AUDIT_VISIBILITIES)[number];
export type AuditMetadata = Record<string, Json>;

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  actorType: ActorType;
  action: string;
  entityType: string;
  entityId: string | null;
  projectId: string | null;
  userId: string | null;
  source: string | null;
  severity: AuditSeverity;
  visibility: AuditVisibility;
  title: string;
  description: string | null;
  metadata: AuditMetadata;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface ProjectActivityEvent {
  id: string;
  projectId: string;
  actorUserId: string | null;
  actorType: ActorType;
  eventType: string;
  entityType: string | null;
  entityId: string | null;
  title: string;
  description: string | null;
  visibility: AuditVisibility;
  severity: AuditSeverity;
  metadata: AuditMetadata;
  createdAt: string;
}

export interface CreateAuditLogInput {
  actorUserId?: string | null;
  actorType?: ActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  source?: string | null;
  severity?: AuditSeverity;
  visibility?: AuditVisibility;
  title: string;
  description?: string | null;
  metadata?: AuditMetadata | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  request?: Pick<Request, "headers"> | null;
  throwOnFailure?: boolean;
}

export interface CreateProjectActivityInput {
  projectId: string;
  actorUserId?: string | null;
  actorType?: ActorType;
  eventType: string;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  description?: string | null;
  visibility?: AuditVisibility;
  severity?: AuditSeverity;
  metadata?: AuditMetadata | null;
  throwOnFailure?: boolean;
}

export interface CreateCombinedAuditEventInput {
  audit?: CreateAuditLogInput | null;
  activity?: CreateProjectActivityInput | null;
}
