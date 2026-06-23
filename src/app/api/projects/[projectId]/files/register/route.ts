import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectAccess } from "@/lib/files/access";
import { createExtractionTaskForFile } from "@/lib/files/create-extraction-task-for-file";
import { registerUploadedFile } from "@/lib/files/register-uploaded-file";
import type { FileMetadata } from "@/types/files";

export const dynamic = "force-dynamic";

export async function POST(
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

    const body = await parseJson(request);
    const file = await registerUploadedFile({
      projectId,
      userId: user.id,
      storageBucket: stringValue(body.storageBucket),
      storagePath: stringValue(body.storagePath),
      originalFileName: stringValue(body.originalFileName),
      fileName: stringValue(body.fileName),
      mimeType: optionalString(body.mimeType),
      fileSize: numberValue(body.fileSize),
      fileHash: optionalString(body.fileHash),
      metadata: metadataValue(body.metadata),
    });
    const extractionTask =
      body.autoProcess === true
        ? await createExtractionTaskForFile({
            fileId: file.id,
            projectId,
            userId: user.id,
          })
        : null;

    return NextResponse.json({ file, extractionTask }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to register uploaded file.");
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

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown): string | null {
  const valueString = stringValue(value);
  return valueString || null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function metadataValue(value: unknown): FileMetadata {
  return isRecord(value) ? (value as FileMetadata) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
