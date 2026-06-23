import { describe, expect, it } from "vitest";
import {
  processWebhookEvent,
  type WebhookProcessorStore,
} from "./process-webhook-event";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { UpdateExtractionTaskStatusInput } from "@/lib/tasks/types";
import type { CreateMessageInput } from "@/types/messages";
import type { WebhookEvent, WebhookEventLog } from "@/types/webhooks";

describe("processWebhookEvent", () => {
  it("routes notification.created events to notify()", async () => {
    const event = createEvent({
      eventType: "notification.created",
      payload: {
        userId: "22222222-2222-2222-2222-222222222222",
        title: "Extraction completed",
        body: "Structured results are ready.",
        type: "success",
        source: "ai-extractor",
        link: "/projects/123/results",
        metadata: {
          taskId: "task-1",
        },
      },
    });
    const store = createMemoryProcessorStore(event);
    const notifications: NotificationPayload[] = [];

    const processed = await processWebhookEvent(event.id, {
      store,
      notifyFn: async (payload) => {
        notifications.push(payload);
        return payload;
      },
    });

    expect(processed.status).toBe("processed");
    expect(notifications).toMatchObject([
      {
        userId: "22222222-2222-2222-2222-222222222222",
        title: "Extraction completed",
        source: "ai-extractor",
      },
    ]);
    expect(store.statuses.map((item) => item.status)).toEqual([
      "processing",
      "processed",
    ]);
  });

  it("routes task.status_changed and message.created events", async () => {
    const taskEvent = createEvent({
      id: "event-task",
      eventType: "task.status_changed",
      taskId: "11111111-1111-1111-1111-111111111111",
      payload: {
        taskId: "11111111-1111-1111-1111-111111111111",
        status: "completed",
        progress: 100,
        metadata: {
          tablesExtracted: 8,
        },
      },
    });
    const messageEvent = createEvent({
      id: "event-message",
      eventType: "message.created",
      conversationId: "33333333-3333-3333-3333-333333333333",
      payload: {
        conversationId: "33333333-3333-3333-3333-333333333333",
        senderType: "ai",
        body: "AI extraction detected 12 tables.",
        metadata: {
          projectId: "44444444-4444-4444-4444-444444444444",
        },
      },
    });
    const taskUpdates: UpdateExtractionTaskStatusInput[] = [];
    const messages: CreateMessageInput[] = [];

    await processWebhookEvent(taskEvent.id, {
      store: createMemoryProcessorStore(taskEvent),
      updateExtractionTaskStatusFn: async (input) => {
        taskUpdates.push(input);
        return input as never;
      },
    });
    await processWebhookEvent(messageEvent.id, {
      store: createMemoryProcessorStore(messageEvent),
      createMessageFn: async (input) => {
        messages.push(input);
        return input as never;
      },
    });

    expect(taskUpdates).toMatchObject([
      {
        taskId: "11111111-1111-1111-1111-111111111111",
        status: "completed",
        progress: 100,
        metadata: {
          tablesExtracted: 8,
        },
      },
    ]);
    expect(messages).toMatchObject([
      {
        conversationId: "33333333-3333-3333-3333-333333333333",
        senderType: "ai",
        body: "AI extraction detected 12 tables.",
      },
    ]);
  });

  it("routes admin.broadcast events to segment recipients", async () => {
    const event = createEvent({
      eventType: "admin.broadcast",
      payload: {
        title: "Maintenance",
        body: "Tonight",
        segmentId: "55555555-5555-4555-8555-555555555555",
        source: "admin-tools",
        metadata: {
          pushPreviewAllowed: false,
        },
      },
    });
    const notifications: NotificationPayload[] = [];

    await processWebhookEvent(event.id, {
      store: createMemoryProcessorStore(event),
      resolveBroadcastRecipientsFn: async (input) => {
        expect(input).toMatchObject({
          targetType: "segment",
          targetPayload: {
            segmentId: "55555555-5555-4555-8555-555555555555",
          },
        });
        return [
          "22222222-2222-4222-8222-222222222222",
          "33333333-3333-4333-8333-333333333333",
        ];
      },
      notifyFn: async (payload) => {
        notifications.push(payload);
        return payload;
      },
    });

    expect(notifications).toMatchObject([
      {
        userId: "22222222-2222-4222-8222-222222222222",
        title: "Maintenance",
        source: "admin-tools",
      },
      {
        userId: "33333333-3333-4333-8333-333333333333",
        title: "Maintenance",
        source: "admin-tools",
      },
    ]);
  });

  it("marks validation failures as failed and stores an error log", async () => {
    const event = createEvent({
      eventType: "admin.broadcast",
      payload: {
        title: "Maintenance",
        body: "Tonight",
        userIds: [],
      },
    });
    const store = createMemoryProcessorStore(event);

    await expect(processWebhookEvent(event.id, { store })).rejects.toThrow(
      "userIds, segmentId, or targetType is required"
    );
    expect(store.statuses.at(-1)).toMatchObject({
      status: "failed",
      errorMessage:
        "userIds, segmentId, or targetType is required for admin.broadcast.",
    });
    expect(store.logs.at(-1)).toMatchObject({
      level: "error",
      message: "Failed to process webhook event.",
    });
  });
});

function createMemoryProcessorStore(
  event: WebhookEvent
): WebhookProcessorStore & {
  statuses: Array<{ status: WebhookEvent["status"]; errorMessage?: string }>;
  logs: WebhookEventLog[];
} {
  const statuses: Array<{
    status: WebhookEvent["status"];
    errorMessage?: string;
  }> = [];
  const logs: WebhookEventLog[] = [];
  let current = event;

  return {
    statuses,
    logs,
    async getEvent(eventId) {
      return current.id === eventId ? current : null;
    },
    async updateEventStatus(eventId, update) {
      if (current.id !== eventId) {
        throw new Error("event not found");
      }
      statuses.push({
        status: update.status,
        errorMessage: update.errorMessage ?? undefined,
      });
      current = {
        ...current,
        status: update.status,
        errorMessage: update.errorMessage ?? current.errorMessage,
        processedAt: update.processedAt ?? current.processedAt,
      };
      return current;
    },
    async insertLog(log) {
      logs.push({
        id: `log-${logs.length + 1}`,
        webhookEventId: log.webhookEventId,
        level: log.level,
        message: log.message,
        metadata: log.metadata ?? {},
        createdAt: "2026-06-22T08:05:00.000Z",
      });
    },
  };
}

function createEvent(overrides: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: "event-1",
    serviceName: "ai-extractor",
    source: "ai-extractor",
    eventType: "notification.created",
    userId: null,
    projectId: null,
    taskId: null,
    conversationId: null,
    payload: {},
    status: "received",
    errorMessage: null,
    idempotencyKey: null,
    receivedAt: "2026-06-22T08:00:00.000Z",
    processedAt: null,
    ...overrides,
  };
}
