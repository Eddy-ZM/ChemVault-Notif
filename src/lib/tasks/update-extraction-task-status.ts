import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import { logEvent } from "@/lib/audit/log-event";
import { updateFileProcessingStatus } from "@/lib/files/update-file-processing-status";
import { createExtractionResult } from "@/lib/results/create-extraction-result";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { AuditSeverity } from "@/types/audit";
import type {
  CreateExtractionResultInput,
  ExtractionResult,
  ExtractionStructuredData,
} from "@/types/extraction-results";
import type { UpdateFileProcessingStatusInput } from "@/types/files";
import {
  buildExtractionNotificationPayload,
  shouldNotifyForStatusTransition,
} from "./extraction-notification-map";
import { createExtractionTaskMessage } from "./extraction-task-messages";
import { createSupabaseExtractionTaskStore } from "./extraction-task-store";
import {
  type ChemVaultExtractionTask,
  type ExtractionTaskMetadata,
  type ExtractionTaskStatus,
  type ExtractionTaskStore,
  type UpdateExtractionTaskStatusInput,
  isExtractionTaskStatus,
} from "./types";

const defaultProgressByStatus = {
  uploaded: 5,
  queued: 10,
  processing: 25,
  extracting: 55,
  validating: 85,
  completed: 100,
  failed: null,
} satisfies Record<ExtractionTaskStatus, number | null>;

interface UpdateExtractionTaskStatusDependencies {
  store?: ExtractionTaskStore;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
  createTaskMessageFn?: (task: ChemVaultExtractionTask) => Promise<unknown>;
  updateFileProcessingStatusFn?: (
    input: UpdateFileProcessingStatusInput
  ) => Promise<unknown>;
  createExtractionResultFn?: (
    input: CreateExtractionResultInput
  ) => Promise<ExtractionResult | unknown>;
}

export async function updateExtractionTaskStatus(
  input: UpdateExtractionTaskStatusInput,
  dependencies: UpdateExtractionTaskStatusDependencies = {}
): Promise<ChemVaultExtractionTask> {
  const taskId = input.taskId?.trim();

  if (!taskId) {
    throw new NotificationError("taskId is required.", undefined, 400);
  }

  const status = normalizeStatus(input.status);
  const store = dependencies.store ?? createSupabaseExtractionTaskStore();
  const existingTask = await store.getById(taskId);

  if (!existingTask) {
    throw new NotificationError("Extraction task not found.", undefined, 404);
  }

  assertTaskScope(existingTask, input);

  const inputMetadata = normalizeInputMetadata(input.metadata);
  const errorMessage = normalizeErrorMessage(input, inputMetadata, status);
  const metadata = {
    ...existingTask.metadata,
    ...inputMetadata,
    ...(errorMessage ? { errorMessage } : {}),
  };

  const updatedTask = await store.update(taskId, {
    status,
    progress: normalizeProgress(input.progress, status, existingTask.progress),
    errorMessage,
    metadata,
  });

  const statusChanged = shouldNotifyForStatusTransition(
    existingTask.status,
    status
  );

  if (statusChanged) {
    await logExtractionStatusChange(existingTask, updatedTask);

    const notifyFn = dependencies.notifyFn ?? notify;
    await notifyFn(buildExtractionNotificationPayload(updatedTask));

    if (updatedTask.projectId) {
      const createTaskMessageFn =
        dependencies.createTaskMessageFn ?? createExtractionTaskMessage;
      await createTaskMessageFn(updatedTask);
    }

    if (updatedTask.fileId) {
      const updateFileProcessingStatusFn =
        dependencies.updateFileProcessingStatusFn ?? updateFileProcessingStatus;
      await updateFileProcessingStatusFn(toFileProcessingInput(updatedTask));
    }

    if (updatedTask.status === "completed" && hasResultOutput(updatedTask)) {
      const createExtractionResultFn =
        dependencies.createExtractionResultFn ?? createExtractionResult;
      await createExtractionResultFn(toExtractionResultInput(updatedTask));
    }
  }

  return updatedTask;
}

function hasResultOutput(task: ChemVaultExtractionTask): boolean {
  return Boolean(
    objectMetadata(task.metadata.structuredData) ||
      objectMetadata(task.metadata.structured_data) ||
      objectMetadata(task.metadata.rawOutput) ||
      objectMetadata(task.metadata.raw_output) ||
      objectMetadata(task.metadata.result)
  );
}

function toExtractionResultInput(
  task: ChemVaultExtractionTask
): CreateExtractionResultInput {
  const rawOutput =
    objectMetadata(task.metadata.rawOutput) ??
    objectMetadata(task.metadata.raw_output) ??
    objectMetadata(task.metadata.result) ??
    {};
  const structuredData =
    objectMetadata(task.metadata.structuredData) ??
    objectMetadata(task.metadata.structured_data) ??
    objectMetadata(task.metadata.result) ??
    rawOutput;

  return {
    taskId: task.id,
    fileId: task.fileId,
    projectId: task.projectId,
    userId: task.userId,
    rawOutput,
    structuredData,
    modelName: stringMetadata(task.metadata.modelName ?? task.metadata.model_name),
    modelVersion: stringMetadata(
      task.metadata.modelVersion ?? task.metadata.model_version
    ),
    confidenceScore: numberMetadata(
      task.metadata.confidenceScore ?? task.metadata.confidence_score
    ),
    metadata: {
      taskId: task.id,
      fileId: task.fileId,
      projectId: task.projectId,
      source: "task_status_completed",
    },
  };
}

function objectMetadata(value: unknown): ExtractionStructuredData | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as ExtractionStructuredData;
}

function stringMetadata(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberMetadata(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toFileProcessingInput(
  task: ChemVaultExtractionTask
): UpdateFileProcessingStatusInput {
  switch (task.status) {
    case "queued":
      return {
        fileId: task.fileId ?? "",
        status: "processing",
        processingStatus: "queued",
        extractionTaskId: task.id,
        metadata: task.metadata,
      };
    case "processing":
      return {
        fileId: task.fileId ?? "",
        status: "processing",
        processingStatus: "none",
        extractionTaskId: task.id,
        metadata: task.metadata,
      };
    case "extracting":
      return {
        fileId: task.fileId ?? "",
        status: "processing",
        processingStatus: "extracting",
        extractionTaskId: task.id,
        metadata: task.metadata,
      };
    case "validating":
      return {
        fileId: task.fileId ?? "",
        status: "processing",
        processingStatus: "validating",
        extractionTaskId: task.id,
        metadata: task.metadata,
      };
    case "completed":
      return {
        fileId: task.fileId ?? "",
        status: "ready",
        processingStatus: "completed",
        extractionTaskId: task.id,
        metadata: task.metadata,
      };
    case "failed":
      return {
        fileId: task.fileId ?? "",
        status: "failed",
        processingStatus: "failed",
        extractionTaskId: task.id,
        errorMessage: task.errorMessage,
        metadata: task.metadata,
      };
    default:
      return {
        fileId: task.fileId ?? "",
        status: "uploaded",
        processingStatus: "none",
        extractionTaskId: task.id,
        metadata: task.metadata,
      };
  }
}

async function logExtractionStatusChange(
  previousTask: ChemVaultExtractionTask,
  task: ChemVaultExtractionTask
) {
  const commonMetadata = {
    taskId: task.id,
    projectId: task.projectId,
    fileId: task.fileId,
    fileName: task.fileName,
    previousStatus: previousTask.status,
    status: task.status,
    progress: task.progress,
    errorMessage: task.errorMessage,
  };

  await logEvent({
    audit: {
      actorUserId: task.userId,
      actorType: "ai",
      action: "extraction.status_changed",
      entityType: "extraction_task",
      entityId: task.id,
      projectId: task.projectId,
      userId: task.userId,
      source: "ai-extractor",
      severity: severityForTaskStatus(task.status),
      visibility: "admin",
      title: "Extraction status changed",
      description: `${previousTask.status} -> ${task.status}`,
      metadata: commonMetadata,
    },
    activity: task.projectId
      ? {
          projectId: task.projectId,
          actorUserId: task.userId,
          actorType: "ai",
          eventType: "extraction.status_changed",
          entityType: "extraction_task",
          entityId: task.id,
          title: "Extraction status changed",
          description: `${previousTask.status} -> ${task.status}`,
          visibility: "project",
          severity: severityForTaskStatus(task.status),
          metadata: commonMetadata,
        }
      : null,
  });

  if (task.status === "completed" || task.status === "failed") {
    await logEvent({
      audit: {
        actorUserId: task.userId,
        actorType: "ai",
        action:
          task.status === "completed"
            ? "extraction.completed"
            : "extraction.failed",
        entityType: "extraction_task",
        entityId: task.id,
        projectId: task.projectId,
        userId: task.userId,
        source: "ai-extractor",
        severity: severityForTaskStatus(task.status),
        visibility: "admin",
        title: terminalTaskTitle(task.status),
        description: terminalTaskDescription(task.status),
        metadata: {
          ...commonMetadata,
          ...task.metadata,
        },
      },
      activity: task.projectId
        ? {
            projectId: task.projectId,
            actorUserId: task.userId,
            actorType: "ai",
            eventType:
              task.status === "completed"
                ? "extraction.completed"
                : "extraction.failed",
            entityType: "extraction_task",
            entityId: task.id,
            title: terminalTaskTitle(task.status),
            description: terminalTaskDescription(task.status),
            visibility: "project",
            severity: severityForTaskStatus(task.status),
            metadata: {
              ...commonMetadata,
              ...task.metadata,
            },
          }
        : null,
    });
  }
}

function severityForTaskStatus(status: ExtractionTaskStatus): AuditSeverity {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "error";
    default:
      return "info";
  }
}

function terminalTaskTitle(status: ExtractionTaskStatus): string {
  return status === "completed" ? "Extraction completed" : "Extraction failed";
}

function terminalTaskDescription(status: ExtractionTaskStatus): string {
  return status === "completed"
    ? "Structured scientific data is ready for review."
    : "AI extraction could not complete successfully.";
}

function normalizeStatus(status: string): ExtractionTaskStatus {
  const trimmed = status?.trim();

  if (!isExtractionTaskStatus(trimmed)) {
    throw new NotificationError(
      `Unsupported extraction task status: ${status}.`,
      undefined,
      400
    );
  }

  return trimmed;
}

function assertTaskScope(
  task: ChemVaultExtractionTask,
  input: UpdateExtractionTaskStatusInput
) {
  if (input.userId && task.userId !== input.userId) {
    throw new NotificationError("Extraction task user mismatch.", undefined, 403);
  }

  if (input.projectId && task.projectId !== input.projectId) {
    throw new NotificationError(
      "Extraction task project mismatch.",
      undefined,
      403
    );
  }
}

function normalizeProgress(
  progress: number | null | undefined,
  status: ExtractionTaskStatus,
  currentProgress: number
) {
  const candidate =
    typeof progress === "number"
      ? progress
      : defaultProgressByStatus[status] ?? currentProgress;

  if (!Number.isFinite(candidate)) {
    return currentProgress;
  }

  return Math.min(100, Math.max(0, Math.round(candidate)));
}

function normalizeInputMetadata(
  metadata: ExtractionTaskMetadata | null | undefined
): ExtractionTaskMetadata {
  if (!metadata || Array.isArray(metadata)) {
    return {};
  }

  return metadata;
}

function normalizeErrorMessage(
  input: UpdateExtractionTaskStatusInput,
  metadata: ExtractionTaskMetadata,
  status: ExtractionTaskStatus
): string | null {
  if (status !== "failed") {
    return null;
  }

  if (typeof input.errorMessage === "string" && input.errorMessage.trim()) {
    return input.errorMessage.trim();
  }

  const metadataError = metadata.errorMessage;
  return typeof metadataError === "string" && metadataError.trim()
    ? metadataError.trim()
    : null;
}
