import type {
  ApprovedDatasetRow,
  ExtractionResultExportRow,
  ExtractionResultRow,
  Json,
  ResultCorrectionRow,
  ResultItemRow,
  ResultReviewRow,
} from "@/lib/supabase/database.types";
import {
  RESULT_ITEM_STATUSES,
  RESULT_ITEM_TYPES,
  RESULT_REVIEW_ACTIONS,
  EXTRACTION_EXPORT_STATUSES,
  EXTRACTION_EXPORT_TYPES,
  EXTRACTION_RESULT_STATUSES,
  type ApprovedDataset,
  type ExtractionExportStatus,
  type ExtractionExportType,
  type ExtractionResult,
  type ExtractionResultExport,
  type ExtractionResultMetadata,
  type ExtractionResultStatus,
  type ExtractionStructuredData,
  type ResultCorrection,
  type ResultItem,
  type ResultItemStatus,
  type ResultItemType,
  type ResultReview,
  type ResultReviewAction,
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
    extractionSummary: row.extraction_summary,
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
  row: ResultItemRow
): ResultItem {
  return {
    id: row.id,
    resultId: row.result_id,
    itemType: isExtractionResultItemType(row.item_type)
      ? row.item_type
      : "note",
    label: row.label,
    value: row.value,
    confidenceScore: row.confidence_score,
    pageNumber: row.page_number,
    sourceLocation: normalizeResultMetadata(row.source_location),
    status: isExtractionResultItemStatus(row.status) ? row.status : "pending",
    reviewerNote: row.reviewer_note,
    originalValue: row.value,
    reviewedBy: null,
    reviewedAt: null,
    metadata: normalizeResultMetadata(row.source_location),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toExtractionResultReview(
  row: ResultReviewRow
): ResultReview {
  return {
    id: row.id,
    resultId: row.result_id,
    reviewerId: row.reviewer_id,
    action: isExtractionReviewAction(row.action) ? row.action : "started_review",
    note: row.note,
    metadata: normalizeResultMetadata(row.metadata),
    comment: row.note,
    changes: normalizeResultMetadata(row.metadata),
    createdAt: row.created_at,
  };
}

export function toResultCorrection(row: ResultCorrectionRow): ResultCorrection {
  return {
    id: row.id,
    resultId: row.result_id,
    resultItemId: row.result_item_id,
    correctedBy: row.corrected_by,
    fieldPath: row.field_path,
    oldValue: row.old_value,
    newValue: row.new_value,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export function toApprovedDataset(row: ApprovedDatasetRow): ApprovedDataset {
  return {
    id: row.id,
    resultId: row.result_id,
    projectId: row.project_id,
    fileId: row.file_id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    data: normalizeResultMetadata(row.data),
    schemaVersion: row.schema_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
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
): value is ResultItemStatus {
  return (
    typeof value === "string" &&
    (RESULT_ITEM_STATUSES as readonly string[]).includes(value)
  );
}

export function isExtractionResultItemType(
  value: unknown
): value is ResultItemType {
  return (
    typeof value === "string" &&
    (RESULT_ITEM_TYPES as readonly string[]).includes(value)
  );
}

export function isExtractionReviewAction(
  value: unknown
): value is ResultReviewAction {
  return (
    typeof value === "string" &&
    (RESULT_REVIEW_ACTIONS as readonly string[]).includes(value)
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
