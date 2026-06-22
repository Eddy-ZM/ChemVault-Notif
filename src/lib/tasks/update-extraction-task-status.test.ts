import { describe, expect, it } from "vitest";
import { updateExtractionTaskStatus } from "./update-extraction-task-status";
import type {
  ChemVaultExtractionTask,
  ExtractionTaskStore,
} from "./types";
import type { NotificationPayload } from "@/lib/notifications/types";

function createTask(
  overrides: Partial<ChemVaultExtractionTask> = {}
): ChemVaultExtractionTask {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    userId: "22222222-2222-2222-2222-222222222222",
    projectId: "33333333-3333-3333-3333-333333333333",
    fileId: "44444444-4444-4444-4444-444444444444",
    fileName: "catalyst-screening.pdf",
    status: "processing",
    progress: 25,
    errorMessage: null,
    metadata: {
      modelName: "chemvault-extractor-v1",
    },
    createdAt: "2026-06-22T04:00:00.000Z",
    updatedAt: "2026-06-22T04:05:00.000Z",
    ...overrides,
  };
}

function createMemoryStore(task: ChemVaultExtractionTask): {
  store: ExtractionTaskStore;
  updates: Array<Partial<ChemVaultExtractionTask>>;
} {
  const updates: Array<Partial<ChemVaultExtractionTask>> = [];
  let current = task;

  return {
    updates,
    store: {
      async getById(taskId) {
        return current.id === taskId ? current : null;
      },
      async update(taskId, update) {
        if (current.id !== taskId) {
          throw new Error("Task not found.");
        }

        updates.push(update);
        current = {
          ...current,
          ...update,
          metadata: update.metadata ?? current.metadata,
          updatedAt: "2026-06-22T04:15:00.000Z",
        };
        return current;
      },
    },
  };
}

describe("updateExtractionTaskStatus", () => {
  it("updates the task and sends one notification when status changes", async () => {
    const task = createTask();
    const { store, updates } = createMemoryStore(task);
    const notifications: NotificationPayload[] = [];

    const updated = await updateExtractionTaskStatus(
      {
        taskId: task.id,
        userId: task.userId,
        projectId: task.projectId,
        status: "extracting",
        progress: 50,
        metadata: {
          tablesDetected: 3,
        },
      },
      {
        store,
        notifyFn: async (payload) => {
          notifications.push(payload);
          return {
            id: "notification-1",
            userId: payload.userId,
            title: payload.title,
            body: payload.body ?? null,
            type: payload.type ?? "info",
            source: payload.source ?? null,
            link: payload.link ?? null,
            read: false,
            metadata: payload.metadata ?? {},
            createdAt: "2026-06-22T04:15:00.000Z",
          };
        },
      }
    );

    expect(updated).toMatchObject({
      status: "extracting",
      progress: 50,
      metadata: {
        modelName: "chemvault-extractor-v1",
        tablesDetected: 3,
      },
    });
    expect(updates).toHaveLength(1);
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: "Scientific data extraction in progress",
      type: "task",
      source: "ai-extractor",
      metadata: {
        taskId: task.id,
        projectId: task.projectId,
        fileId: task.fileId,
        fileName: task.fileName,
        modelName: "chemvault-extractor-v1",
        tablesDetected: 3,
      },
    });
  });

  it("does not notify when only progress changes within the same status", async () => {
    const task = createTask({ status: "processing", progress: 20 });
    const { store } = createMemoryStore(task);
    const notifications: NotificationPayload[] = [];

    const updated = await updateExtractionTaskStatus(
      {
        taskId: task.id,
        status: "processing",
        progress: 30,
      },
      {
        store,
        notifyFn: async (payload) => {
          notifications.push(payload);
          throw new Error("Should not notify.");
        },
      }
    );

    expect(updated.progress).toBe(30);
    expect(notifications).toHaveLength(0);
  });

  it("stores failed task error details and sends the failed notification", async () => {
    const task = createTask({ status: "validating", progress: 82 });
    const { store } = createMemoryStore(task);
    const notifications: NotificationPayload[] = [];

    const updated = await updateExtractionTaskStatus(
      {
        taskId: task.id,
        status: "failed",
        metadata: {
          errorMessage: "Model timeout after validation pass.",
        },
      },
      {
        store,
        notifyFn: async (payload) => {
          notifications.push(payload);
          return {
            id: "notification-1",
            userId: payload.userId,
            title: payload.title,
            body: payload.body ?? null,
            type: payload.type ?? "info",
            source: payload.source ?? null,
            link: payload.link ?? null,
            read: false,
            metadata: payload.metadata ?? {},
            createdAt: "2026-06-22T04:15:00.000Z",
          };
        },
      }
    );

    expect(updated).toMatchObject({
      status: "failed",
      errorMessage: "Model timeout after validation pass.",
    });
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      title: "Extraction failed",
      body: "ChemVault AI could not complete the extraction task. Please review the error details.",
      type: "error",
      metadata: {
        errorMessage: "Model timeout after validation pass.",
      },
    });
  });
});
