import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseFeatureUpdateStore } from "@/lib/feature-updates/feature-update-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const params = await context.params;
    const stats = await createSupabaseFeatureUpdateStore().getStats(params.id);
    return NextResponse.json({ stats });
  } catch (error) {
    return jsonError(error, "Failed to load feature update stats.");
  }
}
