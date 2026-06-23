import type {
  ExtractionResultExportRow,
  ExtractionResultItemRow,
  ExtractionResultReviewRow,
  ExtractionResultRow,
  Json,
} from "@/lib/supabase/database.types";
import {
  EXTRACTION_EXPORT_STATUSES,
  EXTRACTION_EXPORT_TYPES,
  EXTRACTION_RESULT_ITEM_STATUSES,
  EXTRACTION_RESULT_ITEM_TYPES,
  EXTRACTION_RESULT_STATUSES,
  EXTRACTION_REVIEW_ACTIONS,
  type ExtractionExportStatus,
  type ExtractionExportType,
  type ExtractionResult,
  type ExtractionResultExport,
  type ExtractionResultItem,
  type ExtractionResultItemStatus,
  type ExtractionResultItemType,
  type ExtractionResultMetadata,
  type ExtractionResultReview,
  type ExtractionResultStatus,
  type ExtractionReviewAction,
  type ExtractionStructuredData,
} from "@/types/extraction-results";

export function toExtractionResult(row: ExtractionResultRow): ExtractionResult {
  return {
    id: row.id,
    taskId: row.task_id,
    fileId: row.file_id,
    projectId: row.project_id,
    userId: row.user_id,
    status: isExtractionResultStatus(row.status) ? row.status : "draft",
    resultType: row.result_type,
    rawOutput: normalizeStructuredData(row.raw_output),
    structuredData: normalizeStructuredData(row.structured_data),
    confidenceScore: row.confidence_score,
    modelName: row.model_name,
    modelVersion: row.model_version,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    rejectedBy: row.rejected_by,
    rejectedAt: row.rejected_at,
    rejectionReason: row.rejection_reason,
    metadata: normalizeResultMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExtractionResultItem(
  row: ExtractionResultItemRow
): ExtractionResultItem {
  return {
    id: row.id,
    resultId: row.result_id,
    itemType: isExtractionResultItemType(row.item_type)
      ? row.item_type
      : "note",
    label: row.label,
    value: row.value,
    originalValue: row.original_value,
    confidenceScore: row.confidence_score,
    status: isExtractionResultItemStatus(row.status) ? row.status : "pending",
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    metadata: normalizeResultMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExtractionResultReview(
  row: ExtractionResultReviewRow
): ExtractionResultReview {
  return {
    id: row.id,
    resultId: row.result_id,
    reviewerId: row.reviewer_id,
    action: isExtractionReviewAction(row.action) ? row.action : "review_started",
    comment: row.comment,
    changes: normalizeResultMetadata(row.changes),
    createdAt: row.created_at,
  };
}

export function toExtractionResultExport(
  row: ExtractionResultExportRow
): ExtractionResultExport {
  return {
    id: row.id,
    resultId: row.result_id,
    userId: row.user_id,
    exportType: isExtractionExportType(row.export_type)
      ? row.export_type
      : "json",
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    status: isExtractionExportStatus(row.status) ? row.status : "created",
    metadata: normalizeResultMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

export function isExtractionResultStatus(
  value: unknown
): value is ExtractionResultStatus {
  return (
    typeof value === "string" &&
    (EXTRACTION_RESULT_STATUSES as readonly string[]).includes(value)
  );
}

export function isExtractionResultItemStatus(
  value: unknown
): value is ExtractionResultItemStatus {
  return (
    typeof value === "string" &&
    (EXTRACTION_RESULT_ITEM_STATUSES as readonly string[]).includes(value)
  );
}

export function isExtractionResultItemType(
  value: unknown
): value is ExtractionResultItemType {
  return (
    typeof value === "string" &&
    (EXTRACTION_RESULT_ITEM_TYPES as readonly string[]).includes(value)
  );
}

export function isExtractionReviewAction(
  value: unknown
): value is ExtractionReviewAction {
  return (
    typeof value === "string" &&
    (EXTRACTION_REVIEW_ACTIONS as readonly string[]).includes(value)
  );
}

export function isExtractionExportType(
  value: unknown
): value is ExtractionExportType {
  return (
    typeof value === "string" &&
    (EXTRACTION_EXPORT_TYPES as readonly string[]).includes(value)
  );
}

export function isExtractionExportStatus(
  value: unknown
): value is ExtractionExportStatus {
  return (
    typeof value === "string" &&
    (EXTRACTION_EXPORT_STATUSES as readonly string[]).includes(value)
  );
}

export function normalizeStructuredData(value: Json): ExtractionStructuredData {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ExtractionStructuredData;
}

export function normalizeResultMetadata(value: Json): ExtractionResultMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as ExtractionResultMetadata;
}
