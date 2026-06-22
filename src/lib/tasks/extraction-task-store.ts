import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ExtractionTaskUpdate,
  Database,
} from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type ExtractionTaskDomainUpdate,
  type ExtractionTaskStore,
  toChemVaultExtractionTask,
} from "./types";

export function createSupabaseExtractionTaskStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): ExtractionTaskStore {
  return {
    async getById(taskId: string) {
      const { data, error } = await supabase
        .from("extraction_tasks")
        .select("*")
        .eq("id", taskId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toChemVaultExtractionTask(data) : null;
    },

    async update(taskId: string, update: ExtractionTaskDomainUpdate) {
      const { data, error } = await supabase
        .from("extraction_tasks")
        .update(toDatabaseUpdate(update))
        .eq("id", taskId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update extraction task.");
      }

      return toChemVaultExtractionTask(data);
    },
  };
}

function toDatabaseUpdate(
  update: ExtractionTaskDomainUpdate
): ExtractionTaskUpdate {
  return {
    status: update.status,
    progress: update.progress,
    error_message: update.errorMessage,
    metadata: update.metadata,
  };
}
