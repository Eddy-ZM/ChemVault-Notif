import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectResultAccess } from "@/lib/results/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";
import { startReview } from "@/lib/results/start-review";

export const dynamic = "force-dynamic";

export async function POST(
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
    await assertProjectResultAccess({ projectId, resultId, user, store });
    const result = await startReview(
      { resultId, reviewerId: user.id },
      { store }
    );

    return NextResponse.json({ result });
  } catch (error) {
    return jsonError(error, "Failed to start result review.");
  }
}
