import { NextRequest, NextResponse } from "next/server";
import { hasValidInternalKey } from "@/lib/api/internal-key";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { createExtractionResult } from "@/lib/results/create-extraction-result";
import type {
  ExtractionResultMetadata,
  ExtractionStructuredData,
} from "@/types/extraction-results";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!hasValidInternalKey(request)) {
      return unauthorized("Invalid internal ChemVault API key.");
    }

    const body = await parseJson(request);
    const result = await createExtractionResult({
      taskId: stringValue(body.taskId),
      fileId: optionalString(body.fileId),
      projectId: optionalString(body.projectId),
      userId: stringValue(body.userId),
      rawOutput: objectValue(body.rawOutput),
      structuredData: objectValue(body.structuredData),
      modelName: optionalString(body.modelName),
      modelVersion: optionalString(body.modelVersion),
      confidenceScore: numberValue(body.confidenceScore),
      metadata: objectValue(body.metadata),
    });

    return NextResponse.json({ result }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create extraction result.");
  }
}

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const value = await request.json();
    return isRecord(value) ? value : {};
  } catch {
    return {};
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function objectValue(
  value: unknown
): ExtractionStructuredData | ExtractionResultMetadata {
  return isRecord(value)
    ? (value as ExtractionStructuredData | ExtractionResultMetadata)
    : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
