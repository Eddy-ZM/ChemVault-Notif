import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseFeatureUpdateStore } from "@/lib/feature-updates/feature-update-store";
import { validateFeatureUpdateFeedbackStatus } from "@/lib/feature-updates/feature-update-store";
import { NotificationError } from "@/lib/notifications/errors";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const params = await context.params;
    const body = await parseJson(request);
    const status = validateFeatureUpdateFeedbackStatus(
      isRecord(body) ? body.status : null
    );

    if (!status) {
      throw new NotificationError("Invalid feedback status.", undefined, 400);
    }

    const feedback = await createSupabaseFeatureUpdateStore().updateFeedbackStatus(
      params.id,
      status
    );

    return NextResponse.json({ feedback });
  } catch (error) {
    return jsonError(error, "Failed to update feature update feedback.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
