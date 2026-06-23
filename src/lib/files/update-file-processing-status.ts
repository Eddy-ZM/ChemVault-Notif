import { createMessage } from "@/lib/messages/create-message";
import { getOrCreateProjectConversation } from "@/lib/messages/get-or-create-project-conversation";
import { notify } from "@/lib/notifications/notify";
import { NotificationError } from "@/lib/notifications/errors";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { MessageMetadata } from "@/types/messages";
import type {
  FileEventType,
  FileMetadata,
  FileProcessingStatus,
  ProjectFile,
  ProjectFileStatus,
  UpdateFileProcessingStatusInput,
} from "@/types/files";
import {
  createSupabaseFileStore,
  type FileStore,
} from "./file-store";
import { isFileProcessingStatus, isProjectFileStatus } from "./transform";
import { fileAuditMetadata } from "./register-uploaded-file";
import { logFileEvent } from "./log-file-event";

interface UpdateFileProcessingStatusDependencies {
  store?: Pick<FileStore, "getFile" | "updateFile" | "insertFileEvent">;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
  createProjectMessage?: boolean;
}

export async function updateFileProcessingStatus(
  input: UpdateFileProcessingStatusInput,
  dependencies: UpdateFileProcessingStatusDependencies = {}
): Promise<ProjectFile> {
  const fileId = input.fileId?.trim();

  if (!fileId) {
    throw new NotificationError("fileId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseFileStore();
  const existingFile = await store.getFile(fileId);

  if (!existingFile) {
    throw new NotificationError("Project file not found.", undefined, 404);
  }

  const nextStatus = normalizeProjectFileStatus(input.status, existingFile);
  const nextProcessingStatus = normalizeProcessingStatus(
    input.processingStatus,
    existingFile
  );
  const nextExtractionTaskId =
    typeof input.extractionTaskId === "string"
      ? input.extractionTaskId.trim() || null
      : existingFile.extractionTaskId;
  const nextMetadata = mergeMetadata(
    existingFile.metadata,
    input.metadata,
    input.errorMessage
  );

  const changed =
    nextStatus !== existingFile.status ||
    nextProcessingStatus !== existingFile.processingStatus ||
    nextExtractionTaskId !== existingFile.extractionTaskId;

  if (!changed) {
    return existingFile;
  }

  const file = await store.updateFile(fileId, {
    status: nextStatus,
    processingStatus: nextProcessingStatus,
    extractionTaskId: nextExtractionTaskId,
    metadata: nextMetadata,
  });
  const eventType = eventTypeForTransition(existingFile, file);

  if (eventType) {
    const definition = eventDefinition(eventType, file);
    await logFileEvent(
      {
        fileId: file.id,
        projectId: file.projectId,
        userId: file.userId,
        eventType,
        title: definition.title,
        description: definition.description,
        severity: definition.severity,
        metadata: {
          ...fileAuditMetadata(file),
          previousStatus: existingFile.status,
          previousProcessingStatus: existingFile.processingStatus,
          errorMessage: input.errorMessage ?? null,
        },
      },
      { store }
    );

    if (shouldNotify(eventType)) {
      await safeNotify(dependencies.notifyFn ?? notify, notificationPayload(file, eventType));
    }

    if (dependencies.createProjectMessage !== false && shouldCreateMessage(eventType)) {
      await createFileProjectMessage(file, eventType);
    }
  }

  return file;
}

function normalizeProjectFileStatus(
  status: string | null | undefined,
  file: ProjectFile
): ProjectFileStatus {
  if (status == null || status === "") {
    return inferredStatus(file.status, file.processingStatus);
  }

  if (!isProjectFileStatus(status)) {
    throw new NotificationError(
      `Unsupported file status: ${status}.`,
      undefined,
      400
    );
  }

  return status;
}

function normalizeProcessingStatus(
  processingStatus: string | null | undefined,
  file: ProjectFile
): FileProcessingStatus {
  if (processingStatus == null || processingStatus === "") {
    return file.processingStatus;
  }

  if (!isFileProcessingStatus(processingStatus)) {
    throw new NotificationError(
      `Unsupported file processing status: ${processingStatus}.`,
      undefined,
      400
    );
  }

  return processingStatus;
}

function inferredStatus(
  currentStatus: ProjectFileStatus,
  processingStatus: FileProcessingStatus
): ProjectFileStatus {
  if (processingStatus === "completed") {
    return "ready";
  }

  if (processingStatus === "failed") {
    return "failed";
  }

  if (
    processingStatus === "queued" ||
    processingStatus === "parsing" ||
    processingStatus === "extracting" ||
    processingStatus === "validating"
  ) {
    return "processing";
  }

  return currentStatus;
}

function eventTypeForTransition(
  previous: ProjectFile,
  file: ProjectFile
): FileEventType | null {
  if (file.status === "deleted" && previous.status !== "deleted") {
    return "file.deleted";
  }

  if (file.status === "archived" && previous.status !== "archived") {
    return "file.archived";
  }

  if (
    file.processingStatus === "queued" &&
    previous.processingStatus !== "queued"
  ) {
    return "file.processing_queued";
  }

  if (
    file.status === "processing" &&
    previous.status !== "processing" &&
    file.processingStatus === "none"
  ) {
    return "file.processing_started";
  }

  if (
    file.processingStatus === "parsing" &&
    previous.processingStatus !== "parsing"
  ) {
    return "file.parsing_started";
  }

  if (
    file.processingStatus === "extracting" &&
    previous.processingStatus !== "extracting"
  ) {
    return "file.extraction_started";
  }

  if (
    file.processingStatus === "validating" &&
    previous.processingStatus !== "validating"
  ) {
    return "file.validation_started";
  }

  if (
    (file.processingStatus === "completed" || file.status === "ready") &&
    previous.processingStatus !== "completed" &&
    previous.status !== "ready"
  ) {
    return "file.processing_completed";
  }

  if (
    (file.processingStatus === "failed" || file.status === "failed") &&
    previous.processingStatus !== "failed" &&
    previous.status !== "failed"
  ) {
    return "file.processing_failed";
  }

  return null;
}

function eventDefinition(eventType: FileEventType, file: ProjectFile) {
  switch (eventType) {
    case "file.processing_queued":
      return {
        title: "File processing queued",
        description: `${file.originalFileName} was added to the processing queue.`,
        severity: "info" as const,
      };
    case "file.processing_started":
      return {
        title: "File processing started",
        description: `ChemVault started processing ${file.originalFileName}.`,
        severity: "info" as const,
      };
    case "file.parsing_started":
      return {
        title: "File parsing started",
        description: `ChemVault is parsing ${file.originalFileName}.`,
        severity: "info" as const,
      };
    case "file.extraction_started":
      return {
        title: "File extraction started",
        description: `ChemVault AI is extracting scientific data from ${file.originalFileName}.`,
        severity: "info" as const,
      };
    case "file.validation_started":
      return {
        title: "File validation started",
        description: `ChemVault is validating extracted data from ${file.originalFileName}.`,
        severity: "info" as const,
      };
    case "file.processing_completed":
      return {
        title: "File processing completed",
        description: `${file.originalFileName} is ready for review.`,
        severity: "success" as const,
      };
    case "file.processing_failed":
      return {
        title: "File processing failed",
        description: `ChemVault could not process ${file.originalFileName}.`,
        severity: "error" as const,
      };
    case "file.deleted":
      return {
        title: "File deleted",
        description: `${file.originalFileName} was removed from the project.`,
        severity: "warning" as const,
      };
    case "file.archived":
      return {
        title: "File archived",
        description: `${file.originalFileName} was archived.`,
        severity: "info" as const,
      };
    default:
      return {
        title: "File event",
        description: `${file.originalFileName} changed.`,
        severity: "info" as const,
      };
  }
}

function shouldNotify(eventType: FileEventType): boolean {
  return (
    eventType === "file.processing_queued" ||
    eventType === "file.processing_started" ||
    eventType === "file.processing_completed" ||
    eventType === "file.processing_failed"
  );
}

function shouldCreateMessage(eventType: FileEventType): boolean {
  return (
    eventType === "file.processing_started" ||
    eventType === "file.processing_completed" ||
    eventType === "file.processing_failed"
  );
}

function notificationPayload(
  file: ProjectFile,
  eventType: FileEventType
): NotificationPayload {
  const link = file.projectId
    ? `/projects/${file.projectId}/files/${file.id}`
    : "/notifications";

  switch (eventType) {
    case "file.processing_queued":
      return {
        userId: file.userId,
        title: "File processing queued",
        body: "Your file has been added to the processing queue.",
        type: "task",
        source: "chemvault-files",
        link,
        metadata: notificationMetadata(file, eventType),
      };
    case "file.processing_started":
      return {
        userId: file.userId,
        title: "File processing started",
        body: "ChemVault has started processing your file.",
        type: "task",
        source: "chemvault-files",
        link,
        metadata: notificationMetadata(file, eventType),
      };
    case "file.processing_completed":
      return {
        userId: file.userId,
        title: "File processing completed",
        body: "Your file is ready for review.",
        type: "success",
        source: "chemvault-files",
        link,
        metadata: notificationMetadata(file, eventType),
      };
    case "file.processing_failed":
      return {
        userId: file.userId,
        title: "File processing failed",
        body: "ChemVault could not process this file. Please review the details.",
        type: "error",
        source: "chemvault-files",
        link,
        metadata: notificationMetadata(file, eventType),
      };
    default:
      return {
        userId: file.userId,
        title: "File updated",
        body: "Your ChemVault file was updated.",
        type: "info",
        source: "chemvault-files",
        link,
        metadata: notificationMetadata(file, eventType),
      };
  }
}

function notificationMetadata(file: ProjectFile, eventType: FileEventType) {
  return {
    fileId: file.id,
    projectId: file.projectId,
    eventType,
    extractionTaskId: file.extractionTaskId,
    pushPreviewAllowed: false,
  };
}

async function createFileProjectMessage(file: ProjectFile, eventType: FileEventType) {
  if (!file.projectId) {
    return;
  }

  try {
    const definition = eventDefinition(eventType, file);
    const conversation = await getOrCreateProjectConversation({
      projectId: file.projectId,
      userId: file.userId,
      title: "AI Paper Extraction Project",
    });
    const metadata: MessageMetadata = {
      fileId: file.id,
      projectId: file.projectId,
      eventType,
      extractionTaskId: file.extractionTaskId,
      notificationTitle: definition.title,
    };

    await createMessage(
      {
        conversationId: conversation.id,
        senderId: null,
        senderType: "task",
        body: definition.description ?? definition.title,
        metadata,
      },
      { allowPrivilegedSenderTypes: true }
    );
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to create file project message.", error);
    }
  }
}

async function safeNotify(
  notifyFn: (payload: NotificationPayload) => Promise<unknown>,
  payload: NotificationPayload
) {
  try {
    await notifyFn(payload);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to send file status notification.", error);
    }
  }
}

function mergeMetadata(
  current: FileMetadata,
  next: FileMetadata | null | undefined,
  errorMessage: string | null | undefined
): FileMetadata {
  return {
    ...current,
    ...(next && !Array.isArray(next) ? next : {}),
    ...(errorMessage ? { errorMessage } : {}),
  };
}
