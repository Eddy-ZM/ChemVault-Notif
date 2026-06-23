import { NextRequest, NextResponse } from "next/server";
import { hasValidInternalKey } from "@/lib/api/internal-key";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { createExtractionResult } from "@/lib/results/create-extraction-result";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ExtractionResultMetadata,
  ExtractionStructuredData,
  ResultItemInput,
} from "@/types/extraction-results";
import {
  RESULT_ITEM_STATUSES,
  RESULT_ITEM_TYPES,
  type ResultItemStatus,
  type ResultItemType,
} from "@/types/results";

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
      extractionSummary: optionalString(body.extractionSummary),
      metadata: objectValue(body.metadata),
      items: resultItemsValue(body.items),
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

function resultItemsValue(value: unknown): ResultItemInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter(isRecord)
    .map((item) => {
      const itemType = resultItemTypeValue(item.itemType ?? item.item_type);
      const status = resultItemStatusValue(item.status);

      return {
        itemType,
        label: optionalString(item.label),
        value: jsonValue(item.value),
        confidenceScore: numberValue(item.confidenceScore),
        pageNumber: integerValue(item.pageNumber ?? item.page_number),
        sourceLocation: objectValue(item.sourceLocation ?? item.source_location),
        status,
        reviewerNote: optionalString(item.reviewerNote ?? item.reviewer_note),
      };
    });
}

function resultItemTypeValue(value: unknown): ResultItemType {
  return RESULT_ITEM_TYPES.includes(value as ResultItemType)
    ? (value as ResultItemType)
    : "note";
}

function resultItemStatusValue(value: unknown): ResultItemStatus {
  return RESULT_ITEM_STATUSES.includes(value as ResultItemStatus)
    ? (value as ResultItemStatus)
    : "pending";
}

function jsonValue(value: unknown): Json {
  return value === undefined ? {} : (value as Json);
}

function integerValue(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
