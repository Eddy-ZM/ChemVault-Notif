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
    const fileId = request.nextUrl.searchParams.get("fileId")?.trim();
    const taskId = request.nextUrl.searchParams.get("taskId")?.trim();
    const cursor = request.nextUrl.searchParams.get("cursor")?.trim();
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));
    const results = await createSupabaseResultStore().listProjectResults({
      projectId,
      status,
      fileId,
      taskId,
      cursor,
      limit,
    });

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

function parseLimit(value: string | null): number {
  const parsed = Number(value);
  return Number.isFinite(parsed)
    ? Math.min(100, Math.max(1, Math.floor(parsed)))
    : 50;
}
