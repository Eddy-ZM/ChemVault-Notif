import { describe, expect, it } from "vitest";
import {
  buildExtractionNotificationPayload,
  extractionNotificationMap,
  shouldNotifyForStatusTransition,
} from "./extraction-notification-map";
import type { ChemVaultExtractionTask } from "./types";

const baseTask: ChemVaultExtractionTask = {
  id: "11111111-1111-1111-1111-111111111111",
  userId: "22222222-2222-2222-2222-222222222222",
  projectId: "33333333-3333-3333-3333-333333333333",
  fileId: "44444444-4444-4444-4444-444444444444",
  fileName: "catalyst-screening.pdf",
  status: "extracting",
  progress: 55,
  errorMessage: null,
  metadata: {
    modelName: "chemvault-extractor-v1",
  },
  createdAt: "2026-06-22T04:00:00.000Z",
  updatedAt: "2026-06-22T04:10:00.000Z",
};

describe("extractionNotificationMap", () => {
  it("defines notification copy for every supported extraction status", () => {
    expect(Object.keys(extractionNotificationMap)).toEqual([
      "uploaded",
      "queued",
      "processing",
      "extracting",
      "validating",
      "completed",
      "failed",
    ]);

    expect(extractionNotificationMap.completed).toMatchObject({
      title: "Extraction completed",
      type: "success",
      source: "ai-extractor",
    });
    expect(extractionNotificationMap.failed).toMatchObject({
      title: "Extraction failed",
      type: "error",
      source: "ai-extractor",
    });
  });

  it("builds a clean user-facing completed notification with task metadata", () => {
    const payload = buildExtractionNotificationPayload({
      ...baseTask,
      status: "completed",
      progress: 100,
    });

    expect(payload).toEqual({
      userId: baseTask.userId,
      title: "Extraction completed",
      body: "Your document has been converted into structured scientific data.",
      type: "success",
      source: "ai-extractor",
      link: `/projects/${baseTask.projectId}/results`,
      metadata: {
        taskId: baseTask.id,
        projectId: baseTask.projectId,
        fileId: baseTask.fileId,
        fileName: baseTask.fileName,
        modelName: "chemvault-extractor-v1",
      },
    });
  });

  it("keeps failed notification body clean while including error details in metadata", () => {
    const payload = buildExtractionNotificationPayload({
      ...baseTask,
      status: "failed",
      errorMessage: "Unable to parse malformed table region.",
    });

    expect(payload.body).toBe(
      "ChemVault AI could not complete the extraction task. Please review the error details."
    );
    expect(payload.link).toBe(
      `/projects/${baseTask.projectId}/tasks/${baseTask.id}`
    );
    expect(payload.metadata).toMatchObject({
      errorMessage: "Unable to parse malformed table region.",
    });
  });
});

describe("shouldNotifyForStatusTransition", () => {
  it("notifies when the lifecycle stage changes", () => {
    expect(shouldNotifyForStatusTransition("processing", "extracting")).toBe(
      true
    );
    expect(shouldNotifyForStatusTransition("validating", "completed")).toBe(
      true
    );
    expect(shouldNotifyForStatusTransition("processing", "failed")).toBe(true);
  });

  it("does not notify for progress-only updates in the same stage", () => {
    expect(shouldNotifyForStatusTransition("processing", "processing")).toBe(
      false
    );
  });
});
