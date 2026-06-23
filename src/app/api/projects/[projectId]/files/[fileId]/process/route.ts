import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectFileAccess } from "@/lib/files/access";
import { createExtractionTaskForFile } from "@/lib/files/create-extraction-task-for-file";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; fileId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId, fileId } = await context.params;
    await assertProjectFileAccess({ projectId, fileId, user });

    const extractionTask = await createExtractionTaskForFile({
      fileId,
      projectId,
      userId: user.id,
    });

    return NextResponse.json({ extractionTask });
  } catch (error) {
    return jsonError(error, "Failed to start file processing.");
  }
}
