import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import { NotificationError } from "@/lib/notifications/errors";
import type { CreateProjectFileInput, ProjectFile } from "@/types/files";
import {
  createSupabaseFileStore,
  type FileStore,
} from "./file-store";
import { logFileEvent } from "./log-file-event";

interface RegisterUploadedFileDependencies {
  store?: Pick<FileStore, "createFile" | "insertFileEvent">;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
}

export async function registerUploadedFile(
  input: CreateProjectFileInput,
  dependencies: RegisterUploadedFileDependencies = {}
): Promise<ProjectFile> {
  const normalized = normalizeCreateInput(input);
  const store = dependencies.store ?? createSupabaseFileStore();
  const file = await store.createFile(normalized);

  await logFileEvent(
    {
      fileId: file.id,
      projectId: file.projectId,
      userId: file.userId,
      eventType: "file.uploaded",
      title: "File uploaded",
      description: `${file.originalFileName} was uploaded successfully.`,
      severity: "success",
      metadata: fileAuditMetadata(file),
    },
    { store }
  );

  await safeNotify(dependencies.notifyFn ?? notify, {
    userId: file.userId,
    title: "File uploaded",
    body: "Your file has been uploaded successfully.",
    type: "success",
    source: "chemvault-files",
    link: file.projectId
      ? `/projects/${file.projectId}/files/${file.id}`
      : "/notifications",
    metadata: {
      fileId: file.id,
      projectId: file.projectId,
      pushPreviewAllowed: false,
    },
  });

  return file;
}

export function fileAuditMetadata(file: ProjectFile) {
  return {
    fileId: file.id,
    projectId: file.projectId,
    storageBucket: file.storageBucket,
    storagePath: file.storagePath,
    originalFileName: file.originalFileName,
    fileName: file.fileName,
    mimeType: file.mimeType,
    fileSize: file.fileSize,
    fileHash: file.fileHash,
    extractionTaskId: file.extractionTaskId,
    processingStatus: file.processingStatus,
    status: file.status,
  };
}

async function safeNotify(
  notifyFn: (payload: NotificationPayload) => Promise<unknown>,
  payload: NotificationPayload
) {
  try {
    await notifyFn(payload);
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to send file notification.", error);
    }
  }
}

function normalizeCreateInput(input: CreateProjectFileInput): CreateProjectFileInput {
  const storageBucket = requiredString(input.storageBucket, "storageBucket");
  const storagePath = requiredString(input.storagePath, "storagePath");
  const originalFileName = requiredString(
    input.originalFileName,
    "originalFileName"
  );
  const fileName = requiredString(input.fileName, "fileName");
  const userId = requiredString(input.userId, "userId");

  return {
    projectId: optionalString(input.projectId),
    userId,
    storageBucket,
    storagePath,
    originalFileName,
    fileName,
    mimeType: optionalString(input.mimeType),
    fileSize:
      typeof input.fileSize === "number" && Number.isFinite(input.fileSize)
        ? Math.max(0, Math.round(input.fileSize))
        : null,
    fileHash: optionalString(input.fileHash),
    metadata:
      input.metadata && !Array.isArray(input.metadata) ? input.metadata : {},
  };
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
