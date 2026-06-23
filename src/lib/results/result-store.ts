import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ApprovedDatasetInsert,
  Database,
  ExtractionResultExportInsert,
  ExtractionResultInsert,
  ExtractionResultUpdate,
  Json,
  ResultCorrectionInsert,
  ResultItemInsert,
  ResultItemUpdate,
  ResultReviewInsert,
} from "@/lib/supabase/database.types";
import type {
  ApprovedDataset,
  CreateExtractionResultInput,
  ExtractionExportType,
  ExtractionResult,
  ExtractionResultExport,
  ExtractionResultMetadata,
  ExtractionResultStatus,
  ResultCorrection,
  ResultItem,
  ResultItemInput,
  ResultItemStatus,
  ResultReview,
  ResultReviewAction,
} from "@/types/results";
import {
  toApprovedDataset,
  toExtractionResult,
  toExtractionResultExport,
  toExtractionResultItem,
  toExtractionResultReview,
  toResultCorrection,
} from "./transform";

export interface UpdateResultRecordInput {
  status?: ExtractionResultStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedBy?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
  metadata?: ExtractionResultMetadata;
}

export interface InsertReviewRecordInput {
  resultId: string;
  reviewerId: string;
  action: ResultReviewAction;
  note?: string | null;
  metadata?: ExtractionResultMetadata | null;
  comment?: string | null;
  changes?: ExtractionResultMetadata | null;
}

export interface InsertCorrectionRecordInput {
  resultId: string;
  resultItemId?: string | null;
  correctedBy: string;
  fieldPath: string;
  oldValue?: Json | null;
  newValue?: Json | null;
  reason?: string | null;
}

export interface InsertApprovedDatasetInput {
  resultId?: string | null;
  projectId?: string | null;
  fileId?: string | null;
  userId: string;
  title: string;
  description?: string | null;
  data: ExtractionResultMetadata;
  schemaVersion?: string;
}

export interface InsertExportRecordInput {
  resultId: string;
  userId: string;
  exportType: ExtractionExportType;
  storageBucket?: string | null;
  storagePath?: string | null;
  metadata?: ExtractionResultMetadata | null;
}

export interface ResultStore {
  getResult(resultId: string): Promise<ExtractionResult | null>;
  getResultByTaskId(taskId: string): Promise<ExtractionResult | null>;
  listProjectResults(input: {
    projectId: string;
    status?: string | null;
    fileId?: string | null;
    taskId?: string | null;
    limit?: number;
    cursor?: string | null;
  }): Promise<ExtractionResult[]>;
  createResult(
    input: CreateExtractionResultInput,
    items: ResultItemInput[]
  ): Promise<ExtractionResult>;
  listResultItems(resultId: string): Promise<ResultItem[]>;
  getResultItem(itemId: string): Promise<ResultItem | null>;
  updateResultItem(
    itemId: string,
    update: {
      value?: Json;
      status: ResultItemStatus;
      reviewerNote?: string | null;
    }
  ): Promise<ResultItem>;
  updateResult(
    resultId: string,
    update: UpdateResultRecordInput
  ): Promise<ExtractionResult>;
  insertReview(input: InsertReviewRecordInput): Promise<ResultReview>;
  listReviews(resultId: string): Promise<ResultReview[]>;
  insertCorrection(
    input: InsertCorrectionRecordInput
  ): Promise<ResultCorrection>;
  listCorrections(resultId: string): Promise<ResultCorrection[]>;
  insertApprovedDataset(
    input: InsertApprovedDatasetInput
  ): Promise<ApprovedDataset>;
  getApprovedDatasetByResult(
    resultId: string
  ): Promise<ApprovedDataset | null>;
  listApprovedDatasets(projectId: string): Promise<ApprovedDataset[]>;
  getApprovedDataset(datasetId: string): Promise<ApprovedDataset | null>;
  insertExport(input: InsertExportRecordInput): Promise<ExtractionResultExport>;
  listExports(resultId: string): Promise<ExtractionResultExport[]>;
  isProjectMember(projectId: string, userId: string): Promise<boolean>;
}

export function createSupabaseResultStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): ResultStore {
  return {
    async getResult(resultId) {
      const { data, error } = await supabase
        .from("extraction_results")
        .select("*")
        .eq("id", resultId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toExtractionResult(data) : null;
    },

    async getResultByTaskId(taskId) {
      const { data, error } = await supabase
        .from("extraction_results")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toExtractionResult(data) : null;
    },

    async listProjectResults(input) {
      let query = supabase
        .from("extraction_results")
        .select("*")
        .eq("project_id", input.projectId)
        .order("created_at", { ascending: false })
        .limit(input.limit ?? 50);

      if (input.status) {
        query = query.eq("status", input.status);
      }

      if (input.fileId) {
        query = query.eq("file_id", input.fileId);
      }

      if (input.taskId) {
        query = query.eq("task_id", input.taskId);
      }

      if (input.cursor) {
        query = query.lt("created_at", input.cursor);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []).map(toExtractionResult);
    },

    async createResult(input, items) {
      const insert: ExtractionResultInsert = {
        task_id: input.taskId,
        file_id: input.fileId ?? null,
        project_id: input.projectId ?? null,
        user_id: input.userId,
        status: "ready_for_review",
        result_type: "scientific_data",
        raw_output: (input.rawOutput ?? {}) as Json,
        structured_data: (input.structuredData ?? {}) as Json,
        confidence_score: input.confidenceScore ?? null,
        model_name: input.modelName ?? null,
        model_version: input.modelVersion ?? null,
        extraction_summary: input.extractionSummary ?? null,
        metadata: (input.metadata ?? {}) as Json,
      };

      const { data, error } = await supabase
        .from("extraction_results")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create extraction result.");
      }

      const result = toExtractionResult(data);
      const itemRows: ResultItemInsert[] = items.map((item) => ({
        result_id: result.id,
        item_type: item.itemType,
        label: item.label ?? null,
        value: item.value,
        confidence_score: item.confidenceScore ?? null,
        page_number: item.pageNumber ?? null,
        source_location: (item.sourceLocation ?? {}) as Json,
        status: item.status ?? "pending",
        reviewer_note: item.reviewerNote ?? null,
      }));

      if (itemRows.length > 0) {
        const { error: itemError } = await supabase
          .from("result_items")
          .insert(itemRows);

        if (itemError) {
          throw itemError;
        }
      }

      return result;
    },

    async listResultItems(resultId) {
      const { data, error } = await supabase
        .from("result_items")
        .select("*")
        .eq("result_id", resultId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toExtractionResultItem);
    },

    async getResultItem(itemId) {
      const { data, error } = await supabase
        .from("result_items")
        .select("*")
        .eq("id", itemId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toExtractionResultItem(data) : null;
    },

    async updateResultItem(itemId, update) {
      const dbUpdate: ResultItemUpdate = {
        value: update.value,
        status: update.status,
        reviewer_note: update.reviewerNote ?? null,
      };
      const { data, error } = await supabase
        .from("result_items")
        .update(dbUpdate)
        .eq("id", itemId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update result item.");
      }

      return toExtractionResultItem(data);
    },

    async updateResult(resultId, update) {
      const dbUpdate: ExtractionResultUpdate = {
        status: update.status,
        reviewed_by: update.reviewedBy,
        reviewed_at: update.reviewedAt,
        approved_by: update.approvedBy,
        approved_at: update.approvedAt,
        rejected_by: update.rejectedBy,
        rejected_at: update.rejectedAt,
        rejection_reason: update.rejectionReason,
        metadata: update.metadata as Json | undefined,
      };
      const { data, error } = await supabase
        .from("extraction_results")
        .update(dbUpdate)
        .eq("id", resultId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update extraction result.");
      }

      return toExtractionResult(data);
    },

    async insertReview(input) {
      const insert: ResultReviewInsert = {
        result_id: input.resultId,
        reviewer_id: input.reviewerId,
        action: input.action,
        note: input.note ?? input.comment ?? null,
        metadata: (input.metadata ?? input.changes ?? {}) as Json,
      };
      const { data, error } = await supabase
        .from("result_reviews")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create result review.");
      }

      return toExtractionResultReview(data);
    },

    async listReviews(resultId) {
      const { data, error } = await supabase
        .from("result_reviews")
        .select("*")
        .eq("result_id", resultId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toExtractionResultReview);
    },

    async insertCorrection(input) {
      const insert: ResultCorrectionInsert = {
        result_id: input.resultId,
        result_item_id: input.resultItemId ?? null,
        corrected_by: input.correctedBy,
        field_path: input.fieldPath,
        old_value: input.oldValue ?? null,
        new_value: input.newValue ?? null,
        reason: input.reason ?? null,
      };
      const { data, error } = await supabase
        .from("result_corrections")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create result correction.");
      }

      return toResultCorrection(data);
    },

    async listCorrections(resultId) {
      const { data, error } = await supabase
        .from("result_corrections")
        .select("*")
        .eq("result_id", resultId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toResultCorrection);
    },

    async insertApprovedDataset(input) {
      const insert: ApprovedDatasetInsert = {
        result_id: input.resultId ?? null,
        project_id: input.projectId ?? null,
        file_id: input.fileId ?? null,
        user_id: input.userId,
        title: input.title,
        description: input.description ?? null,
        data: input.data as Json,
        schema_version: input.schemaVersion ?? "1.0",
      };
      const { data, error } = await supabase
        .from("approved_datasets")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create approved dataset.");
      }

      return toApprovedDataset(data);
    },

    async getApprovedDatasetByResult(resultId) {
      const { data, error } = await supabase
        .from("approved_datasets")
        .select("*")
        .eq("result_id", resultId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toApprovedDataset(data) : null;
    },

    async listApprovedDatasets(projectId) {
      const { data, error } = await supabase
        .from("approved_datasets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toApprovedDataset);
    },

    async getApprovedDataset(datasetId) {
      const { data, error } = await supabase
        .from("approved_datasets")
        .select("*")
        .eq("id", datasetId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toApprovedDataset(data) : null;
    },

    async insertExport(input) {
      const insert: ExtractionResultExportInsert = {
        result_id: input.resultId,
        user_id: input.userId,
        export_type: input.exportType,
        storage_bucket: input.storageBucket ?? null,
        storage_path: input.storagePath ?? null,
        status: "created",
        metadata: (input.metadata ?? {}) as Json,
      };
      const { data, error } = await supabase
        .from("extraction_result_exports")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create extraction result export.");
      }

      return toExtractionResultExport(data);
    },

    async listExports(resultId) {
      const { data, error } = await supabase
        .from("extraction_result_exports")
        .select("*")
        .eq("result_id", resultId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toExtractionResultExport);
    },

    async isProjectMember(projectId, userId) {
      const { data: conversations, error: conversationError } = await supabase
        .from("conversations")
        .select("id")
        .eq("type", "project")
        .eq("project_id", projectId);

      if (conversationError) {
        throw conversationError;
      }

      const conversationIds = (conversations ?? []).map(
        (conversation) => conversation.id
      );

      if (conversationIds.length === 0) {
        return false;
      }

      const { data, error } = await supabase
        .from("conversation_members")
        .select("id")
        .eq("user_id", userId)
        .in("conversation_id", conversationIds)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return Boolean(data);
    },
  };
}
