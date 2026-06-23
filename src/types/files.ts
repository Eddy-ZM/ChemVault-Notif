import type { AuditSeverity } from "@/types/audit";
import type { Json } from "@/lib/supabase/database.types";

export const PROJECT_FILE_STATUSES = [
  "uploaded",
  "processing",
  "ready",
  "failed",
  "deleted",
  "archived",
] as const;

export const FILE_PROCESSING_STATUSES = [
  "none",
  "queued",
  "parsing",
  "extracting",
  "validating",
  "completed",
  "failed",
] as const;

export const FILE_EVENT_TYPES = [
  "file.uploaded",
  "file.processing_queued",
  "file.processing_started",
  "file.parsing_started",
  "file.extraction_started",
  "file.validation_started",
  "file.processing_completed",
  "file.processing_failed",
  "file.deleted",
  "file.archived",
  "file.permission_changed",
] as const;

export type ProjectFileStatus = (typeof PROJECT_FILE_STATUSES)[number];
export type FileProcessingStatus = (typeof FILE_PROCESSING_STATUSES)[number];
export type FileEventType = (typeof FILE_EVENT_TYPES)[number];
export type FileMetadata = Record<string, Json>;

export interface ProjectFile {
  id: string;
  projectId: string | null;
  userId: string;
  storageBucket: string;
  storagePath: string;
  originalFileName: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  fileHash: string | null;
  status: ProjectFileStatus;
  processingStatus: FileProcessingStatus;
  extractionTaskId: string | null;
  metadata: FileMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface FileEvent {
  id: string;
  fileId: string;
  projectId: string | null;
  userId: string | null;
  eventType: FileEventType;
  title: string;
  description: string | null;
  severity: AuditSeverity;
  metadata: FileMetadata;
  createdAt: string;
}

export interface CreateProjectFileInput {
  projectId?: string | null;
  userId: string;
  storageBucket: string;
  storagePath: string;
  originalFileName: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  fileHash?: string | null;
  metadata?: FileMetadata | null;
}

export interface UpdateFileProcessingStatusInput {
  fileId: string;
  status?: ProjectFileStatus | string | null;
  processingStatus?: FileProcessingStatus | string | null;
  extractionTaskId?: string | null;
  errorMessage?: string | null;
  metadata?: FileMetadata | null;
}

export interface CreateFileEventInput {
  fileId: string;
  projectId?: string | null;
  userId?: string | null;
  eventType: FileEventType;
  title: string;
  description?: string | null;
  severity?: AuditSeverity;
  metadata?: FileMetadata | null;
}
