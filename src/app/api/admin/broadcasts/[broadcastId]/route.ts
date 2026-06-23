import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";
import { isBroadcastTargetType } from "@/lib/broadcasts/transform";
import { NotificationError } from "@/lib/notifications/errors";
import type { Json } from "@/lib/supabase/database.types";
import type { BroadcastJson } from "@/types/broadcasts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ broadcastId: string }> }
) {
  try {
    await requireAdminUser();
    const { broadcastId } = await context.params;
    const store = createSupabaseBroadcastStore();
    const [broadcast, recipients, auditLogs] = await Promise.all([
      store.getBroadcast(broadcastId),
      store.listBroadcastRecipients(broadcastId),
      store.listBroadcastAuditLogs(broadcastId),
    ]);

    if (!broadcast) {
      throw new NotificationError("Broadcast not found.", undefined, 404);
    }

    return NextResponse.json({ broadcast, recipients, auditLogs });
  } catch (error) {
    return jsonError(error, "Failed to load broadcast.");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ broadcastId: string }> }
) {
  try {
    await requireAdminUser();
    const { broadcastId } = await context.params;
    const body = await parseJson(request);
    const input = parseBroadcastUpdate(body);
    const broadcast = await createSupabaseBroadcastStore().updateDraftBroadcast(
      broadcastId,
      input
    );

    return NextResponse.json({ broadcast });
  } catch (error) {
    return jsonError(error, "Failed to update broadcast.");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ broadcastId: string }> }
) {
  try {
    await requireAdminUser();
    const { broadcastId } = await context.params;
    await createSupabaseBroadcastStore().deleteDraftBroadcast(broadcastId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to delete broadcast.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseBroadcastUpdate(body: unknown) {
  if (!isRecord(body)) {
    throw new NotificationError("Request body is required.", undefined, 400);
  }

  const targetType = stringValue(body.targetType);

  if (targetType && !isBroadcastTargetType(targetType)) {
    throw new NotificationError("Invalid targetType.", undefined, 400);
  }

  return {
    title: optionalString(body.title),
    body: optionalString(body.body),
    ignorePreferences: optionalBoolean(body.ignorePreferences),
    type: optionalString(body.type),
    source: optionalString(body.source),
    link: optionalNullableString(body.link),
    targetType: targetType && isBroadcastTargetType(targetType) ? targetType : undefined,
    targetPayload: isRecord(body.targetPayload)
      ? jsonObject(body.targetPayload)
      : undefined,
  };
}

function optionalString(value: unknown): string | undefined {
  const result = stringValue(value);
  return result || undefined;
}

function optionalNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return optionalString(value);
}

function optionalBoolean(value: unknown): boolean | undefined {
  return value === true || value === false ? value : undefined;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
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
