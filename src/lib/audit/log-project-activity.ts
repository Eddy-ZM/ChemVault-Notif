import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ProjectActivityEventInsert } from "@/lib/supabase/database.types";
import type {
  CreateProjectActivityInput,
  ProjectActivityEvent,
} from "@/types/audit";
import { sanitizeAuditMetadata } from "./sanitize";
import { toProjectActivityEvent } from "./transform";

export async function logProjectActivity(
  input: CreateProjectActivityInput
): Promise<ProjectActivityEvent | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const insert: ProjectActivityEventInsert = {
      project_id: input.projectId,
      actor_user_id: input.actorUserId ?? null,
      actor_type: input.actorType ?? "user",
      event_type: input.eventType,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      title: input.title,
      description: input.description ?? null,
      visibility: input.visibility ?? "project",
      severity: input.severity ?? "info",
      metadata: sanitizeAuditMetadata(input.metadata),
    };

    const { data, error } = await supabase
      .from("project_activity_events")
      .insert(insert)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to create project activity event.");
    }

    return toProjectActivityEvent(data);
  } catch (error) {
    if (input.throwOnFailure) {
      throw error;
    }

    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to write project activity event.", error);
    }

    return null;
  }
}
