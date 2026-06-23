import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectAccess } from "@/lib/files/access";
import { NotificationError } from "@/lib/notifications/errors";
import { createSupabaseResultStore } from "@/lib/results/result-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; datasetId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId, datasetId } = await context.params;
    await assertProjectAccess({ projectId, user });
    const store = createSupabaseResultStore();
    const dataset = await store.getApprovedDataset(datasetId);

    if (!dataset || dataset.projectId !== projectId) {
      throw new NotificationError("Approved dataset not found.", undefined, 404);
    }

    const result = dataset.resultId
      ? await store.getResult(dataset.resultId)
      : null;

    return NextResponse.json({ dataset, result });
  } catch (error) {
    return jsonError(error, "Failed to load approved dataset.");
  }
}
