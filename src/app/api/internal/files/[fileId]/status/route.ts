import { NextRequest, NextResponse } from "next/server";
import { hasValidInternalKey } from "@/lib/api/internal-key";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { updateFileProcessingStatus } from "@/lib/files/update-file-processing-status";
import type { FileMetadata } from "@/types/files";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ fileId: string }> }
) {
  try {
    if (!hasValidInternalKey(request)) {
      return unauthorized("Invalid internal ChemVault API key.");
    }

    const { fileId } = await context.params;
    const body = await parseJson(request);
    const file = await updateFileProcessingStatus({
      fileId,
      status: optionalString(body.status),
      processingStatus: optionalString(body.processingStatus),
      extractionTaskId: optionalString(body.extractionTaskId),
      errorMessage: optionalString(body.errorMessage),
      metadata: metadataValue(body.metadata),
    });

    return NextResponse.json({ file });
  } catch (error) {
    return jsonError(error, "Failed to update file status.");
  }
}

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function metadataValue(value: unknown): FileMetadata {
  return isRecord(value) ? (value as FileMetadata) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
