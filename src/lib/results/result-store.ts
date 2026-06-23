import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  ExtractionResultExportInsert,
  ExtractionResultInsert,
  ExtractionResultItemInsert,
  ExtractionResultItemUpdate,
  ExtractionResultReviewInsert,
  ExtractionResultUpdate,
  Json,
} from "@/lib/supabase/database.types";
import type {
  CreateExtractionResultInput,
  ExtractionExportType,
  ExtractionResult,
  ExtractionResultExport,
  ExtractionResultItem,
  ExtractionResultItemStatus,
  ExtractionResultMetadata,
  ExtractionResultReview,
  ExtractionResultStatus,
  ExtractionReviewAction,
  SplitResultItemInput,
} from "@/types/extraction-results";
import {
  toExtractionResult,
  toExtractionResultExport,
  toExtractionResultItem,
  toExtractionResultReview,
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
  action: ExtractionReviewAction;
  comment?: string | null;
  changes?: ExtractionResultMetadata | null;
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
  listProjectResults(projectId: string): Promise<ExtractionResult[]>;
  createResult(
    input: CreateExtractionResultInput,
    items: SplitResultItemInput[]
  ): Promise<ExtractionResult>;
  listResultItems(resultId: string): Promise<ExtractionResultItem[]>;
  getResultItem(itemId: string): Promise<ExtractionResultItem | null>;
  updateResultItem(
    itemId: string,
    update: {
      value?: Json;
      status: ExtractionResultItemStatus;
      reviewedBy: string;
      reviewedAt: string;
    }
  ): Promise<ExtractionResultItem>;
  updateResult(
    resultId: string,
    update: UpdateResultRecordInput
  ): Promise<ExtractionResult>;
  insertReview(input: InsertReviewRecordInput): Promise<ExtractionResultReview>;
  listReviews(resultId: string): Promise<ExtractionResultReview[]>;
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

    async listProjectResults(projectId) {
      const { data, error } = await supabase
        .from("extraction_results")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

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
      const itemRows: ExtractionResultItemInsert[] = items.map((item) => ({
        result_id: result.id,
        item_type: item.itemType,
        label: item.label ?? null,
        value: item.value,
        original_value: item.originalValue ?? item.value,
        confidence_score: item.confidenceScore ?? null,
        status: "pending",
        metadata: (item.metadata ?? {}) as Json,
      }));

      if (itemRows.length > 0) {
        const { error: itemError } = await supabase
          .from("extraction_result_items")
          .insert(itemRows);

        if (itemError) {
          throw itemError;
        }
      }

      return result;
    },

    async listResultItems(resultId) {
      const { data, error } = await supabase
        .from("extraction_result_items")
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
        .from("extraction_result_items")
        .select("*")
        .eq("id", itemId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toExtractionResultItem(data) : null;
    },

    async updateResultItem(itemId, update) {
      const dbUpdate: ExtractionResultItemUpdate = {
        value: update.value,
        status: update.status,
        reviewed_by: update.reviewedBy,
        reviewed_at: update.reviewedAt,
      };
      const { data, error } = await supabase
        .from("extraction_result_items")
        .update(dbUpdate)
        .eq("id", itemId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update extraction result item.");
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
      const insert: ExtractionResultReviewInsert = {
        result_id: input.resultId,
        reviewer_id: input.reviewerId,
        action: input.action,
        comment: input.comment ?? null,
        changes: (input.changes ?? {}) as Json,
      };
      const { data, error } = await supabase
        .from("extraction_result_reviews")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create extraction result review.");
      }

      return toExtractionResultReview(data);
    },

    async listReviews(resultId) {
      const { data, error } = await supabase
        .from("extraction_result_reviews")
        .select("*")
        .eq("result_id", resultId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toExtractionResultReview);
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
