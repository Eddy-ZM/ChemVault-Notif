import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { isAdminEmail } from "@/lib/auth/require-admin";
import { markFeatureUpdateRead } from "@/lib/feature-updates/mark-feature-update-read";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();
    const params = await context.params;

    if (!user) {
      return unauthorized();
    }

    await markFeatureUpdateRead({
      updateId: params.id,
      userId: user.id,
      isAdmin: isAdminEmail(user.email),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to mark feature update as read.");
  }
}
