import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectAccess } from "@/lib/files/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId } = await context.params;
    await assertProjectAccess({ projectId, user });

    const status = request.nextUrl.searchParams.get("status")?.trim();
    const resultType = request.nextUrl.searchParams.get("resultType")?.trim();
    const results = await createSupabaseResultStore().listProjectResults(projectId);

    return NextResponse.json({
      results: results.filter(
        (result) =>
          (!status || result.status === status) &&
          (!resultType || result.resultType === resultType)
      ),
    });
  } catch (error) {
    return jsonError(error, "Failed to load extraction results.");
  }
}
