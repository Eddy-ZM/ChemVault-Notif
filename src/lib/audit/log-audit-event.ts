import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AuditLogInsert } from "@/lib/supabase/database.types";
import type { AuditLog, CreateAuditLogInput } from "@/types/audit";
import { sanitizeAuditMetadata } from "./sanitize";
import { toAuditLog } from "./transform";

export async function logAuditEvent(
  input: CreateAuditLogInput
): Promise<AuditLog | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const requestHeaders = input.request?.headers;
    const insert: AuditLogInsert = {
      actor_user_id: input.actorUserId ?? null,
      actor_type: input.actorType ?? "user",
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      project_id: input.projectId ?? null,
      user_id: input.userId ?? null,
      source: input.source ?? null,
      severity: input.severity ?? "info",
      visibility: input.visibility ?? "admin",
      title: input.title,
      description: input.description ?? null,
      metadata: sanitizeAuditMetadata(input.metadata),
      ip_address: input.ipAddress ?? extractIpAddress(requestHeaders),
      user_agent: input.userAgent ?? requestHeaders?.get("user-agent") ?? null,
    };

    const { data, error } = await supabase
      .from("audit_logs")
      .insert(insert)
      .select("*")
      .single();

    if (error || !data) {
      throw error ?? new Error("Failed to create audit log.");
    }

    return toAuditLog(data);
  } catch (error) {
    if (input.throwOnFailure) {
      throw error;
    }

    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to write audit log.", error);
    }

    return null;
  }
}

function extractIpAddress(headers: Headers | undefined): string | null {
  if (!headers) {
    return null;
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("fly-client-ip") ??
    null
  );
}
