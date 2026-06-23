import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectAccess } from "@/lib/files/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId } = await context.params;
    await assertProjectAccess({ projectId, user });
    const datasets = await createSupabaseResultStore().listApprovedDatasets(
      projectId
    );

    return NextResponse.json({ datasets });
  } catch (error) {
    return jsonError(error, "Failed to load approved datasets.");
  }
}
