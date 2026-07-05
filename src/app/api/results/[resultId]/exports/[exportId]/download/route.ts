import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { NotificationError } from "@/lib/notifications/errors";
import { assertResultAccess } from "@/lib/results/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ExtractionResultExport } from "@/types/extraction-results";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ resultId: string; exportId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { resultId, exportId } = await context.params;
    const store = createSupabaseResultStore();
    await assertResultAccess({ resultId, user, store });

    const exportRecord = await store.getExport(exportId);

    if (!exportRecord || exportRecord.resultId !== resultId) {
      throw new NotificationError("Extraction result export not found.", undefined, 404);
    }

    if (exportRecord.storageBucket && exportRecord.storagePath) {
      const { data, error } = await createSupabaseAdminClient()
        .storage.from(exportRecord.storageBucket)
        .createSignedUrl(exportRecord.storagePath, 60, {
          download: exportFileName(exportRecord),
        });

      if (error || !data?.signedUrl) {
        throw new NotificationError("Unable to create export download link.", error);
      }

      return NextResponse.redirect(data.signedUrl, 302);
    }

    const content = exportRecord.metadata.inlineContent;

    if (typeof content !== "string") {
      throw new NotificationError("Export download payload not found.", undefined, 404);
    }

    return new NextResponse(content, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": contentDisposition(exportFileName(exportRecord)),
        "Content-Type": exportContentType(exportRecord),
      },
    });
  } catch (error) {
    return jsonError(error, "Failed to download extraction result export.");
  }
}

function exportFileName(exportRecord: ExtractionResultExport) {
  const metadataFileName = exportRecord.metadata.fileName;
  const fallback = `chemvault-result.${exportRecord.exportType}`;
  return typeof metadataFileName === "string" && metadataFileName.trim()
    ? metadataFileName.trim()
    : fallback;
}

function exportContentType(exportRecord: ExtractionResultExport) {
  const contentType = exportRecord.metadata.contentType;
  return typeof contentType === "string" && contentType.trim()
    ? contentType.trim()
    : "application/octet-stream";
}

function contentDisposition(fileName: string) {
  return `attachment; filename="${fileName.replace(/[\r\n"]/g, "_")}"`;
}
