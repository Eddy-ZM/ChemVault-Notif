import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectAccess } from "@/lib/files/access";
import { createSupabaseFileStore } from "@/lib/files/file-store";

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

    const files = await createSupabaseFileStore().listProjectFiles(projectId);
    const status = request.nextUrl.searchParams.get("status")?.trim();
    const processingStatus =
      request.nextUrl.searchParams.get("processingStatus")?.trim();

    return NextResponse.json({
      files: files.filter(
        (file) =>
          (!status || file.status === status) &&
          (!processingStatus || file.processingStatus === processingStatus)
      ),
    });
  } catch (error) {
    return jsonError(error, "Failed to load project files.");
  }
}
