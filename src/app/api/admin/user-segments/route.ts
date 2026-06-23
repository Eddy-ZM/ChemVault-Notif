import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";
import { NotificationError } from "@/lib/notifications/errors";
import type { Json } from "@/lib/supabase/database.types";
import type { BroadcastJson, UserSegmentType } from "@/types/broadcasts";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    const segments = await createSupabaseBroadcastStore().listSegments();
    return NextResponse.json({ segments });
  } catch (error) {
    return jsonError(error, "Failed to load user segments.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminUser();
    const body = await parseJson(request);
    const input = parseSegmentInput(body);
    const segment = await createSupabaseBroadcastStore().createSegment({
      ...input,
      createdBy: user.id,
    });

    return NextResponse.json({ segment }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create user segment.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseSegmentInput(body: unknown) {
  if (!isRecord(body)) {
    throw new NotificationError("Request body is required.", undefined, 400);
  }

  const name = stringValue(body.name);

  if (!name) {
    throw new NotificationError("name is required.", undefined, 400);
  }

  return {
    name,
    description: stringValue(body.description) || null,
    type: userSegmentType(body.type),
    criteria: jsonObject(body.criteria),
  };
}

function userSegmentType(value: unknown): UserSegmentType {
  return value === "dynamic" ? "dynamic" : "manual";
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
