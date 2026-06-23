import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";
import { NotificationError } from "@/lib/notifications/errors";
import type { Json } from "@/lib/supabase/database.types";
import type { BroadcastJson, UserSegmentType } from "@/types/broadcasts";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ segmentId: string }> }
) {
  try {
    await requireAdminUser();
    const { segmentId } = await context.params;
    const store = createSupabaseBroadcastStore();
    const [segment, members] = await Promise.all([
      store.getSegment(segmentId),
      store.listSegmentMembers(segmentId),
    ]);

    if (!segment) {
      throw new NotificationError("User segment not found.", undefined, 404);
    }

    return NextResponse.json({ segment, members });
  } catch (error) {
    return jsonError(error, "Failed to load user segment.");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ segmentId: string }> }
) {
  try {
    await requireAdminUser();
    const { segmentId } = await context.params;
    const body = await parseJson(request);
    const segment = await createSupabaseBroadcastStore().updateSegment(
      segmentId,
      parseSegmentUpdate(body)
    );

    return NextResponse.json({ segment });
  } catch (error) {
    return jsonError(error, "Failed to update user segment.");
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ segmentId: string }> }
) {
  try {
    await requireAdminUser();
    const { segmentId } = await context.params;
    await createSupabaseBroadcastStore().deleteSegment(segmentId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to delete user segment.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseSegmentUpdate(body: unknown) {
  if (!isRecord(body)) {
    throw new NotificationError("Request body is required.", undefined, 400);
  }

  return {
    name: optionalString(body.name),
    description:
      body.description === null ? null : optionalString(body.description),
    type: userSegmentTypeOrUndefined(body.type),
    criteria: isRecord(body.criteria) ? jsonObject(body.criteria) : undefined,
  };
}

function userSegmentTypeOrUndefined(value: unknown): UserSegmentType | undefined {
  if (value === "manual" || value === "dynamic") {
    return value;
  }

  return undefined;
}

function optionalString(value: unknown): string | undefined {
  const result = typeof value === "string" ? value.trim() : "";
  return result || undefined;
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
