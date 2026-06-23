import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { resolveBroadcastRecipients } from "@/lib/broadcasts/resolve-broadcast-recipients";
import { isBroadcastTargetType } from "@/lib/broadcasts/transform";
import { NotificationError } from "@/lib/notifications/errors";
import type { Json } from "@/lib/supabase/database.types";
import type { BroadcastJson } from "@/types/broadcasts";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    await requireAdminUser();
    const body = await parseJson(request);

    if (!isRecord(body)) {
      throw new NotificationError("Request body is required.", undefined, 400);
    }

    const targetType = stringValue(body.targetType);

    if (!isBroadcastTargetType(targetType)) {
      throw new NotificationError("Invalid targetType.", undefined, 400);
    }

    const userIds = await resolveBroadcastRecipients({
      targetType,
      targetPayload: jsonObject(body.targetPayload),
    });

    return NextResponse.json({
      recipientCount: userIds.length,
      sampleRecipients: userIds.slice(0, 10),
    });
  } catch (error) {
    return jsonError(error, "Failed to preview broadcast recipients.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
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
