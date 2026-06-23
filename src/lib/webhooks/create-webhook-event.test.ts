import { describe, expect, it } from "vitest";
import {
  createWebhookEvent,
  type WebhookEventStore,
} from "./create-webhook-event";
import type { WebhookEvent } from "@/types/webhooks";

describe("createWebhookEvent", () => {
  it("returns the existing event for duplicate service idempotency keys", async () => {
    const created: WebhookEvent[] = [];
    const existing = createEvent({ id: "event-existing" });
    const store = createMemoryWebhookEventStore([existing], created);

    const event = await createWebhookEvent(
      {
        serviceName: "ai-extractor",
        source: "ai-extractor",
        eventType: "notification.created",
        userId: "22222222-2222-2222-2222-222222222222",
        payload: {
          title: "Done",
        },
        idempotencyKey: "notification-1",
      },
      { store }
    );

    expect(event).toEqual(existing);
    expect(created).toHaveLength(0);
  });

  it("creates a received event when the idempotency key has not been seen", async () => {
    const created: WebhookEvent[] = [];
    const store = createMemoryWebhookEventStore([], created);

    const event = await createWebhookEvent(
      {
        serviceName: "ai-extractor",
        source: "ai-extractor",
        eventType: "message.created",
        conversationId: "33333333-3333-3333-3333-333333333333",
        payload: {
          body: "AI extraction detected 12 tables.",
        },
        idempotencyKey: "message-1",
      },
      { store }
    );

    expect(event).toMatchObject({
      serviceName: "ai-extractor",
      source: "ai-extractor",
      eventType: "message.created",
      conversationId: "33333333-3333-3333-3333-333333333333",
      status: "received",
      idempotencyKey: "message-1",
    });
    expect(created).toHaveLength(1);
  });
});

function createMemoryWebhookEventStore(
  events: WebhookEvent[],
  created: WebhookEvent[]
): WebhookEventStore {
  return {
    async findByIdempotencyKey(serviceName, idempotencyKey) {
      return (
        events.find(
          (event) =>
            event.serviceName === serviceName &&
            event.idempotencyKey === idempotencyKey
        ) ?? null
      );
    },
    async insertEvent(input) {
      const event = createEvent({
        ...input,
        id: `event-${events.length + created.length + 1}`,
      });
      created.push(event);
      events.push(event);
      return event;
    },
  };
}

function createEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: "event-1",
    serviceName: "ai-extractor",
    source: "ai-extractor",
    eventType: "notification.created",
    userId: "22222222-2222-2222-2222-222222222222",
    projectId: null,
    taskId: null,
    conversationId: null,
    payload: {},
    status: "received",
    errorMessage: null,
    idempotencyKey: "notification-1",
    receivedAt: "2026-06-22T08:00:00.000Z",
    processedAt: null,
    ...overrides,
  };
}
