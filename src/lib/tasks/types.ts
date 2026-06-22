import type { ExtractionTaskRow, Json } from "@/lib/supabase/database.types";

export const EXTRACTION_TASK_STATUSES = [
  "uploaded",
  "queued",
  "processing",
  "extracting",
  "validating",
  "completed",
  "failed",
] as const;

export type ExtractionTaskStatus = (typeof EXTRACTION_TASK_STATUSES)[number];
export type ExtractionTaskMetadata = Record<string, Json>;

export interface ChemVaultExtractionTask {
  id: string;
  userId: string;
  projectId: string | null;
  fileId: string | null;
  fileName: string | null;
  status: ExtractionTaskStatus;
  progress: number;
  errorMessage: string | null;
  metadata: ExtractionTaskMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionTaskDomainUpdate {
  status?: ExtractionTaskStatus;
  progress?: number;
  errorMessage?: string | null;
  metadata?: ExtractionTaskMetadata;
}

export interface ExtractionTaskStore {
  getById(taskId: string): Promise<ChemVaultExtractionTask | null>;
  update(
    taskId: string,
    update: ExtractionTaskDomainUpdate
  ): Promise<ChemVaultExtractionTask>;
}

export interface UpdateExtractionTaskStatusInput {
  taskId: string;
  userId?: string;
  projectId?: string | null;
  status: ExtractionTaskStatus | string;
  progress?: number | null;
  errorMessage?: string | null;
  metadata?: ExtractionTaskMetadata | null;
}

export function isExtractionTaskStatus(
  value: unknown
): value is ExtractionTaskStatus {
  return (
    typeof value === "string" &&
    (EXTRACTION_TASK_STATUSES as readonly string[]).includes(value)
  );
}

export function toChemVaultExtractionTask(
  row: ExtractionTaskRow
): ChemVaultExtractionTask {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id,
    fileId: row.file_id,
    fileName: row.file_name,
    status: isExtractionTaskStatus(row.status) ? row.status : "uploaded",
    progress: row.progress,
    errorMessage: row.error_message,
    metadata: normalizeTaskMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeTaskMetadata(value: Json): ExtractionTaskMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ExtractionTaskMetadata;
}
