import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { isAdminEmail } from "@/lib/auth/require-admin";
import { submitFeatureUpdateFeedback } from "@/lib/feature-updates/submit-feature-update-feedback";
import { NotificationError } from "@/lib/notifications/errors";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();
    const params = await context.params;

    if (!user) {
      return unauthorized();
    }

    const body = await parseJson(request);

    if (!isRecord(body)) {
      throw new NotificationError("Request body is required.", undefined, 400);
    }

    const feedback = stringValue(body.feedback);
    const rating = numberValue(body.rating);
    const result = await submitFeatureUpdateFeedback({
      updateId: params.id,
      userId: user.id,
      feedback,
      rating,
      isAdmin: isAdminEmail(user.email),
    });

    return NextResponse.json({ feedback: result }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to submit feature update feedback.");
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

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
