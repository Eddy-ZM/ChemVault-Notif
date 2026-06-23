import type { Json } from "@/lib/supabase/database.types";

export const EXTRACTION_RESULT_STATUSES = [
  "draft",
  "ready_for_review",
  "in_review",
  "approved",
  "rejected",
  "exported",
  "archived",
] as const;

export const EXTRACTION_RESULT_ITEM_STATUSES = [
  "pending",
  "accepted",
  "corrected",
  "rejected",
] as const;

export const EXTRACTION_RESULT_ITEM_TYPES = [
  "table",
  "compound",
  "reaction",
  "property",
  "experimental_condition",
  "measurement",
  "reference",
  "note",
] as const;

export const EXTRACTION_REVIEW_ACTIONS = [
  "review_started",
  "item_accepted",
  "item_corrected",
  "item_rejected",
  "result_approved",
  "result_rejected",
  "export_created",
] as const;

export const EXTRACTION_EXPORT_TYPES = ["json", "csv", "xlsx"] as const;
export const EXTRACTION_EXPORT_STATUSES = ["created", "failed", "deleted"] as const;

export type ExtractionResultStatus =
  (typeof EXTRACTION_RESULT_STATUSES)[number];
export type ExtractionResultItemStatus =
  (typeof EXTRACTION_RESULT_ITEM_STATUSES)[number];
export type ExtractionResultItemType =
  (typeof EXTRACTION_RESULT_ITEM_TYPES)[number];
export type ExtractionReviewAction = (typeof EXTRACTION_REVIEW_ACTIONS)[number];
export type ExtractionExportType = (typeof EXTRACTION_EXPORT_TYPES)[number];
export type ExtractionExportStatus =
  (typeof EXTRACTION_EXPORT_STATUSES)[number];
export type ExtractionResultMetadata = Record<string, Json>;
export type ExtractionStructuredData = Record<string, Json>;

export interface ExtractionResult {
  id: string;
  taskId: string;
  fileId: string | null;
  projectId: string | null;
  userId: string;
  status: ExtractionResultStatus;
  resultType: string;
  rawOutput: ExtractionStructuredData;
  structuredData: ExtractionStructuredData;
  confidenceScore: number | null;
  modelName: string | null;
  modelVersion: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  metadata: ExtractionResultMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionResultItem {
  id: string;
  resultId: string;
  itemType: ExtractionResultItemType;
  label: string | null;
  value: Json;
  originalValue: Json | null;
  confidenceScore: number | null;
  status: ExtractionResultItemStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  metadata: ExtractionResultMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionResultReview {
  id: string;
  resultId: string;
  reviewerId: string;
  action: ExtractionReviewAction;
  comment: string | null;
  changes: ExtractionResultMetadata;
  createdAt: string;
}

export interface ExtractionResultExport {
  id: string;
  resultId: string;
  userId: string;
  exportType: ExtractionExportType;
  storageBucket: string | null;
  storagePath: string | null;
  status: ExtractionExportStatus;
  metadata: ExtractionResultMetadata;
  createdAt: string;
}

export interface CreateExtractionResultInput {
  taskId: string;
  fileId?: string | null;
  projectId?: string | null;
  userId: string;
  rawOutput?: ExtractionStructuredData | null;
  structuredData?: ExtractionStructuredData | null;
  modelName?: string | null;
  modelVersion?: string | null;
  confidenceScore?: number | null;
  metadata?: ExtractionResultMetadata | null;
}

export interface SplitResultItemInput {
  itemType: ExtractionResultItemType;
  label?: string | null;
  value: Json;
  originalValue?: Json | null;
  confidenceScore?: number | null;
  metadata?: ExtractionResultMetadata | null;
}

export interface UpdateExtractionResultItemInput {
  itemId: string;
  userId: string;
  value?: Json;
  status: ExtractionResultItemStatus;
  comment?: string | null;
}
