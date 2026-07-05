import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectFileAccess } from "@/lib/files/access";
import { createSupabaseFileStore } from "@/lib/files/file-store";
import { NotificationError } from "@/lib/notifications/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
    const file = await assertProjectFileAccess({
      projectId,
      fileId,
      user,
      store: createSupabaseFileStore(),
    });

    if (file.status === "deleted") {
      throw new NotificationError("This project file has been deleted.", undefined, 410);
    }

    const { data, error } = await createSupabaseAdminClient()
      .storage.from(file.storageBucket)
      .createSignedUrl(file.storagePath, 60, {
        download: downloadFileName(file.originalFileName, file.fileName),
      });

    if (error || !data?.signedUrl) {
      throw new NotificationError("Unable to create file download link.", error);
    }

    return NextResponse.redirect(data.signedUrl, 302);
  } catch (error) {
    return jsonError(error, "Failed to download project file.");
  }
}

function downloadFileName(originalFileName: string, fileName: string) {
  return originalFileName.trim() || fileName.trim() || "chemvault-file";
}
