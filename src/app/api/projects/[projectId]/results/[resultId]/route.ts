import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectResultAccess } from "@/lib/results/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; resultId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId, resultId } = await context.params;
    const store = createSupabaseResultStore();
    const result = await assertProjectResultAccess({
      projectId,
      resultId,
      user,
      store,
    });
    const [items, reviews, corrections, approvedDataset, exportRecords] =
      await Promise.all([
      store.listResultItems(result.id),
      store.listReviews(result.id),
      store.listCorrections(result.id),
      store.getApprovedDatasetByResult(result.id),
      store.listExports(result.id),
    ]);

    return NextResponse.json({
      result,
      items,
      reviews,
      corrections,
      approvedDataset,
      exports: exportRecords,
    });
  } catch (error) {
    return jsonError(error, "Failed to load extraction result.");
  }
}
