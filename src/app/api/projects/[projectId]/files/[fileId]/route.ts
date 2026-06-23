import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectFileAccess } from "@/lib/files/access";
import { createSupabaseFileStore } from "@/lib/files/file-store";
import { createSupabaseResultStore } from "@/lib/results/result-store";
import { updateFileProcessingStatus } from "@/lib/files/update-file-processing-status";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ projectId: string; fileId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId, fileId } = await context.params;
    const store = createSupabaseFileStore();
    const file = await assertProjectFileAccess({
      projectId,
      fileId,
      user,
      store,
    });
    const events = await store.listFileEvents(file.id);
    const result = file.extractionTaskId
      ? await createSupabaseResultStore().getResultByTaskId(file.extractionTaskId)
      : null;

    return NextResponse.json({ file, events, result });
  } catch (error) {
    return jsonError(error, "Failed to load project file.");
  }
}

export async function DELETE(
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

    const file = await updateFileProcessingStatus({
      fileId,
      status: "deleted",
      processingStatus: "none",
      metadata: {
        deletedBy: user.id,
      },
    });

    return NextResponse.json({ file });
  } catch (error) {
    return jsonError(error, "Failed to delete project file.");
  }
}
