import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NotificationError } from "@/lib/notifications/errors";
import type {
  ExtractionTaskInsert,
  Json,
} from "@/lib/supabase/database.types";
import {
  toChemVaultExtractionTask,
  type ChemVaultExtractionTask,
} from "@/lib/tasks/types";
import type { ProjectFile } from "@/types/files";
import {
  createSupabaseFileStore,
  type FileStore,
} from "./file-store";
import { fileAuditMetadata } from "./register-uploaded-file";
import { updateFileProcessingStatus } from "./update-file-processing-status";

const AI_EXTRACTION_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

interface CreateExtractionTaskForFileInput {
  fileId: string;
  projectId?: string | null;
  userId?: string | null;
}

interface CreateExtractionTaskForFileDependencies {
  store?: Pick<FileStore, "getFile" | "updateFile" | "insertFileEvent">;
}

export async function createExtractionTaskForFile(
  input: CreateExtractionTaskForFileInput,
  dependencies: CreateExtractionTaskForFileDependencies = {}
): Promise<ChemVaultExtractionTask> {
  const fileId = input.fileId?.trim();

  if (!fileId) {
    throw new NotificationError("fileId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseFileStore();
  const file = await store.getFile(fileId);

  if (!file) {
    throw new NotificationError("Project file not found.", undefined, 404);
  }

  if (input.projectId && file.projectId !== input.projectId) {
    throw new NotificationError("File project mismatch.", undefined, 403);
  }

  if (input.userId && file.userId !== input.userId) {
    throw new NotificationError("File user mismatch.", undefined, 403);
  }

  if (!isSupportedForAiExtraction(file)) {
    throw new NotificationError(
      "This file type is not supported for AI extraction.",
      undefined,
      400
    );
  }

  if (file.extractionTaskId) {
    const existing = await loadExtractionTask(file.extractionTaskId);
    if (existing) {
      return existing;
    }
  }

  const task = await insertExtractionTask(file);
  await updateFileProcessingStatus(
    {
      fileId: file.id,
      status: "processing",
      processingStatus: "queued",
      extractionTaskId: task.id,
      metadata: {
        ...file.metadata,
        extractionTaskId: task.id,
      },
    },
    { store }
  );

  return task;
}

export function isSupportedForAiExtraction(file: Pick<ProjectFile, "mimeType">) {
  return Boolean(file.mimeType && AI_EXTRACTION_MIME_TYPES.has(file.mimeType));
}

async function loadExtractionTask(
  taskId: string
): Promise<ChemVaultExtractionTask | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("extraction_tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toChemVaultExtractionTask(data) : null;
}

async function insertExtractionTask(
  file: ProjectFile
): Promise<ChemVaultExtractionTask> {
  const insert: ExtractionTaskInsert = {
    user_id: file.userId,
    project_id: file.projectId,
    file_id: file.id,
    file_name: file.originalFileName,
    status: "queued",
    progress: 10,
    metadata: {
      ...fileAuditMetadata(file),
      queuedFromFileUpload: true,
    } as Json,
  };

  const { data, error } = await createSupabaseAdminClient()
    .from("extraction_tasks")
    .insert(insert)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create extraction task.");
  }

  return toChemVaultExtractionTask(data);
}
