import { NotificationError } from "@/lib/notifications/errors";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import type { WebhookEvent, WebhookPayload } from "@/types/webhooks";
import { isWebhookEventType } from "./transform";
import {
  createSupabaseWebhookStore,
  type WebhookStore,
} from "./webhook-store";

interface CreateWebhookEventInput {
  serviceName: string;
  source: string;
  eventType: string;
  userId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  conversationId?: string | null;
  payload?: WebhookPayload | null;
  idempotencyKey?: string | null;
}

export type WebhookEventStore = Pick<
  WebhookStore,
  "findByIdempotencyKey" | "insertEvent"
>;

interface CreateWebhookEventDependencies {
  store?: WebhookEventStore;
}

export async function createWebhookEvent(
  input: CreateWebhookEventInput,
  dependencies: CreateWebhookEventDependencies = {}
): Promise<WebhookEvent> {
  const serviceName = requiredString(input.serviceName, "serviceName");
  const source = requiredString(input.source, "source");
  const idempotencyKey = optionalString(input.idempotencyKey);

  if (!isWebhookEventType(input.eventType)) {
    throw new NotificationError("Invalid webhook event type.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseWebhookStore();

  if (idempotencyKey) {
    const existing = await store.findByIdempotencyKey(
      serviceName,
      idempotencyKey
    );

    if (existing) {
      return existing;
    }
  }

  const event = await store.insertEvent({
    serviceName,
    source,
    eventType: input.eventType,
    userId: optionalString(input.userId),
    projectId: optionalString(input.projectId),
    taskId: optionalString(input.taskId),
    conversationId: optionalString(input.conversationId),
    payload: normalizePayload(input.payload),
    idempotencyKey,
  });

  await logAuditEvent({
    actorType: "service",
    action: "webhook.received",
    entityType: "webhook_event",
    entityId: event.id,
    projectId: event.projectId,
    userId: event.userId,
    source: event.serviceName,
    severity: "info",
    visibility: "admin",
    title: "Webhook received",
    description: `${event.serviceName} submitted ${event.eventType}.`,
    metadata: {
      webhookEventId: event.id,
      eventType: event.eventType,
      source: event.source,
      serviceName: event.serviceName,
      taskId: event.taskId,
      conversationId: event.conversationId,
      idempotencyKey: event.idempotencyKey,
    },
  });

  return event;
}

function requiredString(value: string | null | undefined, field: string): string {
  const trimmed = optionalString(value);

  if (!trimmed) {
    throw new NotificationError(`${field} is required.`, undefined, 400);
  }

  return trimmed;
}

function optionalString(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePayload(
  payload: WebhookPayload | null | undefined
): WebhookPayload {
  if (!payload || Array.isArray(payload)) {
    return {};
  }

  return payload;
}
