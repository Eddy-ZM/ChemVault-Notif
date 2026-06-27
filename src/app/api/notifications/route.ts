import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { hasValidInternalKey } from "@/lib/api/internal-key";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notifications/notify";
import { parseNotificationQuery } from "@/lib/notifications/filters";
import { toChemVaultNotification } from "@/lib/notifications/transform";
import type {
  NotificationMetadata,
  NotificationPayload,
} from "@/lib/notifications/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const supabase = createSupabaseAdminClient();
    const filters = parseNotificationQuery(request.nextUrl.searchParams);
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(filters.limit);

    if (filters.read === "read") {
      query = query.eq("read", true);
    }

    if (filters.read === "unread") {
      query = query.eq("read", false);
    }

    if (filters.source) {
      query = query.eq("source", filters.source);
    }

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const { count, error: countError } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (countError) {
      throw countError;
    }

    return NextResponse.json({
      notifications: (data ?? []).map(toChemVaultNotification),
      unreadCount: count ?? 0,
    });
  } catch (error) {
    return jsonError(error, "Failed to load notifications.");
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidInternalKey(request)) {
      return unauthorized("Invalid internal ChemVault API key.");
    }

    const body = await parseJson(request);
    const notification = await notify(toNotificationPayload(body));

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create notification.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function toNotificationPayload(body: unknown): NotificationPayload {
  if (!isRecord(body)) {
    return {
      userId: "",
      title: "",
    };
  }

  return {
    userId: stringValue(body.userId),
    title: stringValue(body.title),
    body: optionalStringValue(body.body),
    type: optionalStringValue(body.type),
    source: optionalStringValue(body.source),
    link: optionalStringValue(body.link),
    metadata: isRecord(body.metadata)
      ? (body.metadata as NotificationMetadata)
      : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalStringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
