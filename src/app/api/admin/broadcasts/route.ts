import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";
import { isBroadcastTargetType } from "@/lib/broadcasts/transform";
import { NotificationError } from "@/lib/notifications/errors";
import type { Json } from "@/lib/supabase/database.types";
import type { BroadcastJson } from "@/types/broadcasts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    const broadcasts = await createSupabaseBroadcastStore().listBroadcasts();
    return NextResponse.json({ broadcasts });
  } catch (error) {
    return jsonError(error, "Failed to load broadcasts.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminUser();
    const body = await parseJson(request);
    const input = parseBroadcastInput(body);
    const broadcast = await createSupabaseBroadcastStore().createBroadcast({
      ...input,
      createdBy: user.id,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorType: "admin",
      action: "broadcast.created",
      entityType: "broadcast",
      entityId: broadcast.id,
      source: broadcast.source,
      severity: "info",
      visibility: "admin",
      title: "Broadcast created",
      description: broadcast.title,
      metadata: {
        broadcastId: broadcast.id,
        targetType: broadcast.targetType,
        ignorePreferences: broadcast.ignorePreferences,
      },
    });

    return NextResponse.json({ broadcast }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create broadcast.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseBroadcastInput(body: unknown) {
  if (!isRecord(body)) {
    throw new NotificationError("Request body is required.", undefined, 400);
  }

  const title = stringValue(body.title);
  const messageBody = stringValue(body.body);
  const type = stringValue(body.type) || "system";
  const source = stringValue(body.source) || "admin";
  const link = stringValue(body.link) || null;
  const ignorePreferences = isBooleanLike(body.ignorePreferences)
    ? body.ignorePreferences
    : false;
  const targetType = stringValue(body.targetType);

  if (!title) {
    throw new NotificationError("title is required.", undefined, 400);
  }

  if (!messageBody) {
    throw new NotificationError("body is required.", undefined, 400);
  }

  if (!isBroadcastTargetType(targetType)) {
    throw new NotificationError("Invalid targetType.", undefined, 400);
  }

  return {
    title,
    body: messageBody,
    type,
    source,
    link,
    ignorePreferences,
    targetType,
    targetPayload: jsonObject(body.targetPayload),
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isBooleanLike(value: unknown): value is boolean {
  return value === true || value === false;
}

function jsonObject(value: unknown): BroadcastJson {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, Json>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
