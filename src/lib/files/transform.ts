import type {
  FileEventRow,
  Json,
  ProjectFileRow,
} from "@/lib/supabase/database.types";
import { isAuditSeverity } from "@/lib/audit/transform";
import {
  FILE_EVENT_TYPES,
  FILE_PROCESSING_STATUSES,
  PROJECT_FILE_STATUSES,
  type FileEvent,
  type FileEventType,
  type FileMetadata,
  type FileProcessingStatus,
  type ProjectFile,
  type ProjectFileStatus,
} from "@/types/files";

export function toProjectFile(row: ProjectFileRow): ProjectFile {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    originalFileName: row.original_file_name,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    fileHash: row.file_hash,
    status: isProjectFileStatus(row.status) ? row.status : "uploaded",
    processingStatus: isFileProcessingStatus(row.processing_status)
      ? row.processing_status
      : "none",
    extractionTaskId: row.extraction_task_id,
    metadata: normalizeFileMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toFileEvent(row: FileEventRow): FileEvent {
  return {
    id: row.id,
    fileId: row.file_id,
    projectId: row.project_id,
    userId: row.user_id,
    eventType: isFileEventType(row.event_type)
      ? row.event_type
      : "file.uploaded",
    title: row.title,
    description: row.description,
    severity: isAuditSeverity(row.severity) ? row.severity : "info",
    metadata: normalizeFileMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

export function isProjectFileStatus(
  value: unknown
): value is ProjectFileStatus {
  return (
    typeof value === "string" &&
    (PROJECT_FILE_STATUSES as readonly string[]).includes(value)
  );
}

export function isFileProcessingStatus(
  value: unknown
): value is FileProcessingStatus {
  return (
    typeof value === "string" &&
    (FILE_PROCESSING_STATUSES as readonly string[]).includes(value)
  );
}

export function isFileEventType(value: unknown): value is FileEventType {
  return (
    typeof value === "string" &&
    (FILE_EVENT_TYPES as readonly string[]).includes(value)
  );
}

export function normalizeFileMetadata(value: Json): FileMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as FileMetadata;
}
