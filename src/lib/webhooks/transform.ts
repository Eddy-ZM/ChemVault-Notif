import type {
  Json,
  WebhookEventLogRow,
  WebhookEventRow,
} from "@/lib/supabase/database.types";
import {
  WEBHOOK_EVENT_STATUSES,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_LOG_LEVELS,
  type WebhookEvent,
  type WebhookEventLog,
  type WebhookEventStatus,
  type WebhookEventType,
  type WebhookLogLevel,
  type WebhookPayload,
} from "@/types/webhooks";

export function isWebhookEventType(value: unknown): value is WebhookEventType {
  return (
    typeof value === "string" &&
    (WEBHOOK_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function isWebhookEventStatus(
  value: unknown
): value is WebhookEventStatus {
  return (
    typeof value === "string" &&
    (WEBHOOK_EVENT_STATUSES as readonly string[]).includes(value)
  );
}

export function toWebhookEvent(row: WebhookEventRow): WebhookEvent {
  return {
    id: row.id,
    serviceName: row.service_name,
    source: row.source,
    eventType: isWebhookEventType(row.event_type)
      ? row.event_type
      : "notification.created",
    userId: row.user_id,
    projectId: row.project_id,
    taskId: row.task_id,
    conversationId: row.conversation_id,
    payload: normalizeWebhookPayload(row.payload),
    status: isWebhookEventStatus(row.status) ? row.status : "received",
    errorMessage: row.error_message,
    idempotencyKey: row.idempotency_key,
    receivedAt: row.received_at,
    processedAt: row.processed_at,
  };
}

export function toWebhookEventLog(row: WebhookEventLogRow): WebhookEventLog {
  return {
    id: row.id,
    webhookEventId: row.webhook_event_id,
    level: isWebhookLogLevel(row.level) ? row.level : "info",
    message: row.message,
    metadata: normalizeWebhookPayload(row.metadata),
    createdAt: row.created_at,
  };
}

export function normalizeWebhookPayload(value: Json): WebhookPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as WebhookPayload;
}

function isWebhookLogLevel(value: unknown): value is WebhookLogLevel {
  return (
    typeof value === "string" &&
    (WEBHOOK_LOG_LEVELS as readonly string[]).includes(value)
  );
}
