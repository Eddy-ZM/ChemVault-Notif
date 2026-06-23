import type { Json } from "@/lib/supabase/database.types";

export const EXTRACTION_RESULT_STATUSES = [
  "draft",
  "ready_for_review",
  "in_review",
  "approved",
  "rejected",
  "rerun_requested",
  "archived",
  "exported",
] as const;

export const RESULT_ITEM_STATUSES = [
  "pending",
  "accepted",
  "corrected",
  "rejected",
  "uncertain",
] as const;

export const RESULT_REVIEW_ACTIONS = [
  "started_review",
  "item_accepted",
  "item_corrected",
  "item_rejected",
  "approved",
  "rejected",
  "rerun_requested",
  "comment_added",
] as const;

export const RESULT_ITEM_TYPES = [
  "compound",
  "reaction",
  "table",
  "measurement",
  "spectrum",
  "property",
  "method",
  "condition",
  "citation",
  "note",
] as const;

export const EXTRACTION_EXPORT_TYPES = ["json", "csv", "xlsx"] as const;
export const EXTRACTION_EXPORT_STATUSES = ["created", "failed", "deleted"] as const;

export type ExtractionResultStatus =
  (typeof EXTRACTION_RESULT_STATUSES)[number];
export type ResultItemStatus = (typeof RESULT_ITEM_STATUSES)[number];
export type ResultReviewAction = (typeof RESULT_REVIEW_ACTIONS)[number];
export type ResultItemType = (typeof RESULT_ITEM_TYPES)[number];
export type ExtractionExportType = (typeof EXTRACTION_EXPORT_TYPES)[number];
export type ExtractionExportStatus =
  (typeof EXTRACTION_EXPORT_STATUSES)[number];
export type ResultJsonObject = Record<string, Json>;

export interface ExtractionResult {
  id: string;
  taskId: string;
  fileId: string | null;
  projectId: string | null;
  userId: string;
  status: ExtractionResultStatus;
  resultType: string;
  rawOutput: ResultJsonObject;
  structuredData: ResultJsonObject;
  confidenceScore: number | null;
  modelName: string | null;
  modelVersion: string | null;
  extractionSummary: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy?: string | null;
  approvedAt: string | null;
  rejectedBy?: string | null;
  rejectedAt: string | null;
  rejectionReason?: string | null;
  metadata?: ResultJsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface ResultItem {
  id: string;
  resultId: string;
  itemType: ResultItemType;
  label: string | null;
  value: Json;
  confidenceScore: number | null;
  pageNumber: number | null;
  sourceLocation: ResultJsonObject;
  status: ResultItemStatus;
  reviewerNote: string | null;
  originalValue?: Json | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  metadata?: ResultJsonObject;
  createdAt: string;
  updatedAt: string;
}

export interface ResultReview {
  id: string;
  resultId: string;
  reviewerId: string;
  action: ResultReviewAction;
  note: string | null;
  metadata: ResultJsonObject;
  comment?: string | null;
  changes?: ResultJsonObject;
  createdAt: string;
}

export interface ResultCorrection {
  id: string;
  resultId: string;
  resultItemId: string | null;
  correctedBy: string;
  fieldPath: string;
  oldValue: Json | null;
  newValue: Json | null;
  reason: string | null;
  createdAt: string;
}

export interface ApprovedDataset {
  id: string;
  resultId: string | null;
  projectId: string | null;
  fileId: string | null;
  userId: string;
  title: string;
  description: string | null;
  data: ResultJsonObject;
  schemaVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResultItemInput {
  itemType: ResultItemType;
  label?: string | null;
  value: Json;
  originalValue?: Json | null;
  confidenceScore?: number | null;
  pageNumber?: number | null;
  sourceLocation?: ResultJsonObject | null;
  status?: ResultItemStatus;
  reviewerNote?: string | null;
  metadata?: ResultJsonObject | null;
}

export interface CreateExtractionResultInput {
  taskId: string;
  fileId?: string | null;
  projectId?: string | null;
  userId: string;
  rawOutput?: ResultJsonObject | null;
  structuredData?: ResultJsonObject | null;
  confidenceScore?: number | null;
  modelName?: string | null;
  modelVersion?: string | null;
  extractionSummary?: string | null;
  metadata?: ResultJsonObject | null;
  items?: ResultItemInput[] | null;
}

export interface UpdateResultItemInput {
  resultItemId: string;
  reviewerId: string;
  status: ResultItemStatus;
  newValue?: Json;
  reviewerNote?: string | null;
  reason?: string | null;
}

export interface ReviewActionInput {
  resultId: string;
  reviewerId: string;
  action: ResultReviewAction;
  note?: string | null;
  metadata?: ResultJsonObject | null;
}

export interface ExtractionResultExport {
  id: string;
  resultId: string;
  userId: string;
  exportType: ExtractionExportType;
  storageBucket: string | null;
  storagePath: string | null;
  status: ExtractionExportStatus;
  metadata: ResultJsonObject;
  createdAt: string;
}

export type ExtractionResultMetadata = ResultJsonObject;
export type ExtractionStructuredData = ResultJsonObject;
export type ExtractionResultItem = ResultItem;
export type ExtractionResultItemStatus = ResultItemStatus;
export type ExtractionResultItemType = ResultItemType;
export type ExtractionResultReview = ResultReview;
export type ExtractionReviewAction = ResultReviewAction;
export type SplitResultItemInput = ResultItemInput;

export interface UpdateExtractionResultItemInput {
  itemId?: string;
  resultItemId?: string;
  userId?: string;
  reviewerId?: string;
  value?: Json;
  newValue?: Json;
  status: ResultItemStatus;
  comment?: string | null;
  reviewerNote?: string | null;
  reason?: string | null;
}
