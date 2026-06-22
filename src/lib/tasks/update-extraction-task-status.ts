import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import {
  buildExtractionNotificationPayload,
  shouldNotifyForStatusTransition,
} from "./extraction-notification-map";
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

  if (shouldNotifyForStatusTransition(existingTask.status, status)) {
    const notifyFn = dependencies.notifyFn ?? notify;
    await notifyFn(buildExtractionNotificationPayload(updatedTask));
  }

  return updatedTask;
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
