import { NextRequest, NextResponse } from "next/server";
import { hasValidInternalKey } from "@/lib/api/internal-key";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { updateExtractionTaskStatus } from "@/lib/tasks/update-extraction-task-status";
import type { ExtractionTaskMetadata } from "@/lib/tasks/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    if (!hasValidInternalKey(request)) {
      return unauthorized("Invalid internal ChemVault API key.");
    }

    const { taskId } = await context.params;
    const body = await parseJson(request);
    const task = await updateExtractionTaskStatus(toStatusInput(taskId, body));

    return NextResponse.json({ task });
  } catch (error) {
    return jsonError(error, "Failed to update extraction task status.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function toStatusInput(taskId: string, body: unknown) {
  if (!isRecord(body)) {
    return {
      taskId,
      status: "",
    };
  }

  return {
    taskId,
    status: stringValue(body.status),
    progress: numberValue(body.progress),
    errorMessage: optionalStringValue(body.errorMessage),
    metadata: isRecord(body.metadata)
      ? (body.metadata as ExtractionTaskMetadata)
      : {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalStringValue(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
