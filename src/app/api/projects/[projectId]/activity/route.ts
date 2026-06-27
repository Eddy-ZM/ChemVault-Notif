import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { isChemVaultAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { NotificationError } from "@/lib/notifications/errors";
import { toProjectActivityEvent } from "@/lib/audit/transform";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId } = await context.params;
    const admin = isChemVaultAdminUser(user);
    const supabase = createSupabaseAdminClient();

    if (!admin && !(await isProjectMember(projectId, user.id))) {
      throw new NotificationError("Project access required.", undefined, 403);
    }

    const params = request.nextUrl.searchParams;
    const limit = clampLimit(params.get("limit"));
    let query = supabase
      .from("project_activity_events")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!admin) {
      query = query.eq("visibility", "project");
    }

    const cursor = validDate(params.get("cursor"));
    const eventType = params.get("eventType")?.trim();
    const severity = params.get("severity")?.trim();

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    if (severity) {
      query = query.eq("severity", severity);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const events = (data ?? []).map(toProjectActivityEvent);
    const nextCursor =
      events.length === limit ? events.at(-1)?.createdAt ?? null : null;

    return NextResponse.json({ events, nextCursor });
  } catch (error) {
    return jsonError(error, "Failed to load project activity.");
  }
}

async function isProjectMember(
  projectId: string,
  userId: string
): Promise<boolean> {
  const supabase = createSupabaseAdminClient();
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
