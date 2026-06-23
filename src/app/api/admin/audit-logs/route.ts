import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toAuditLog } from "@/lib/audit/transform";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
    const params = request.nextUrl.searchParams;
    const limit = clampLimit(params.get("limit"));
    let query = createSupabaseAdminClient()
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    query = applyTextFilter(query, "action", params.get("action"));
    query = applyTextFilter(query, "actor_type", params.get("actorType"));
    query = applyTextFilter(query, "entity_type", params.get("entityType"));
    query = applyTextFilter(query, "source", params.get("source"));
    query = applyTextFilter(query, "severity", params.get("severity"));
    query = applyTextFilter(query, "project_id", params.get("projectId"));
    query = applyTextFilter(query, "user_id", params.get("userId"));

    const from = validDate(params.get("from"));
    const to = validDate(params.get("to"));
    const cursor = validDate(params.get("cursor"));
    const search = params.get("search")?.trim();

    if (from) {
      query = query.gte("created_at", from);
    }

    if (to) {
      query = query.lte("created_at", to);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    if (search) {
      const pattern = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
      query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const auditLogs = (data ?? []).map(toAuditLog);
    const nextCursor =
      auditLogs.length === limit ? auditLogs.at(-1)?.createdAt ?? null : null;

    return NextResponse.json({ auditLogs, nextCursor });
  } catch (error) {
    return jsonError(error, "Failed to load audit logs.");
  }
}

function applyTextFilter<Query>(
  query: Query,
  column: string,
  value: string | null
): Query {
  const trimmed = value?.trim();
  if (!trimmed) {
    return query;
  }

  return (query as { eq: (column: string, value: string) => Query }).eq(
    column,
    trimmed
  );
}

function clampLimit(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 50;
  }

  return Math.min(100, Math.max(1, Math.round(parsed)));
}

function validDate(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
