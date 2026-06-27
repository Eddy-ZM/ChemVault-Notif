import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { isChemVaultAdminUser } from "@/lib/auth/require-admin";
import { reactToFeatureUpdate } from "@/lib/feature-updates/react-to-feature-update";
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
    const reaction = isRecord(body) ? body.reaction : null;

    if (typeof reaction !== "string") {
      throw new NotificationError("reaction is required.", undefined, 400);
    }

    await reactToFeatureUpdate({
      updateId: params.id,
      userId: user.id,
      reaction,
      isAdmin: isChemVaultAdminUser(user),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to save feature update reaction.");
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
