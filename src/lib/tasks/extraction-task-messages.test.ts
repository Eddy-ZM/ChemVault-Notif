import { describe, expect, it } from "vitest";
import { buildExtractionTaskMessageInput } from "./extraction-task-messages";
import type { ChemVaultExtractionTask } from "./types";

describe("buildExtractionTaskMessageInput", () => {
  it("creates task message copy and metadata for extraction status updates", () => {
    const task = createTask({
      status: "extracting",
      progress: 55,
      metadata: {
        tablesDetected: 8,
      },
    });

    expect(buildExtractionTaskMessageInput(task)).toEqual({
      projectId: "33333333-3333-3333-3333-333333333333",
      userId: "22222222-2222-2222-2222-222222222222",
      title: "AI Paper Extraction Project",
      body: "AI is extracting tables, chemical entities, and experimental values.",
      metadata: {
        taskId: task.id,
        projectId: task.projectId,
        fileId: task.fileId,
        fileName: task.fileName,
        status: "extracting",
        progress: 55,
        tablesDetected: 8,
        notificationTitle: "AI extraction update",
      },
    });
  });
});

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
    metadata: {},
    createdAt: "2026-06-22T04:00:00.000Z",
    updatedAt: "2026-06-22T04:05:00.000Z",
    ...overrides,
  };
}
