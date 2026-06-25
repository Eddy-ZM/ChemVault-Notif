import type { Json } from "@/lib/supabase/database.types";

export const API_KEY_SCOPES = [
  "notifications:create",
  "tasks:update",
  "messages:create",
  "webhooks:send",
  "admin:broadcast",
  "admin:broadcast:all",
  "files:create",
  "files:update",
  "files:delete",
  "results:create",
  "results:update",
  "results:export",
  "feature_updates:create",
  "feature_updates:publish",
] as const;

export const WEBHOOK_EVENT_TYPES = [
  "notification.created",
  "task.status_changed",
  "message.created",
  "admin.broadcast",
  "file.uploaded",
  "file.status_changed",
  "result.created",
  "feature_update.published",
] as const;

export const WEBHOOK_EVENT_STATUSES = [
  "received",
  "processing",
  "processed",
  "failed",
  "ignored",
] as const;

export const WEBHOOK_LOG_LEVELS = [
  "debug",
  "info",
  "warning",
  "error",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];
export type WebhookEventStatus = (typeof WEBHOOK_EVENT_STATUSES)[number];
export type WebhookLogLevel = (typeof WEBHOOK_LOG_LEVELS)[number];
export type WebhookPayload = Record<string, Json>;

export interface ServiceApiKey {
  id: string;
  name: string;
  keyHash: string;
  keyPrefix: string;
  serviceName: string;
  allowedSources: string[];
  scopes: ApiKeyScope[];
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceApiKeyIdentity {
  apiKeyId: string;
  serviceName: string;
  allowedSources: string[];
  scopes: ApiKeyScope[];
}

export interface WebhookEvent {
  id: string;
  serviceName: string;
  source: string;
  eventType: WebhookEventType;
  userId: string | null;
  projectId: string | null;
  taskId: string | null;
  conversationId: string | null;
  payload: WebhookPayload;
  status: WebhookEventStatus;
  errorMessage: string | null;
  idempotencyKey: string | null;
  receivedAt: string;
  processedAt: string | null;
}

export interface WebhookEventLog {
  id: string;
  webhookEventId: string;
  level: WebhookLogLevel;
  message: string;
  metadata: WebhookPayload;
  createdAt: string;
}
