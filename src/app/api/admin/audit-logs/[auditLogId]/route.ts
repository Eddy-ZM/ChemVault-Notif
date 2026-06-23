import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NotificationError } from "@/lib/notifications/errors";
import { toAuditLog } from "@/lib/audit/transform";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ auditLogId: string }> }
) {
  try {
    await requireAdminUser();
    const { auditLogId } = await context.params;
    const { data, error } = await createSupabaseAdminClient()
      .from("audit_logs")
      .select("*")
      .eq("id", auditLogId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      throw new NotificationError("Audit log not found.", undefined, 404);
    }

    return NextResponse.json({ auditLog: toAuditLog(data) });
  } catch (error) {
    return jsonError(error, "Failed to load audit log.");
  }
}
