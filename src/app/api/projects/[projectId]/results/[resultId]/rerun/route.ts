import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectResultAccess } from "@/lib/results/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";
import { requestRerun } from "@/lib/results/request-rerun";
import type { ExtractionResultMetadata } from "@/types/results";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string; resultId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId, resultId } = await context.params;
    const store = createSupabaseResultStore();
    await assertProjectResultAccess({ projectId, resultId, user, store });
    const body = await parseJson(request);
    const result = await requestRerun(
      {
        resultId,
        reviewerId: user.id,
        note: optionalString(body.note),
        metadata: objectValue(body.metadata),
      },
      { store }
    );

    return NextResponse.json({ result });
  } catch (error) {
    return jsonError(error, "Failed to request extraction rerun.");
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

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function objectValue(value: unknown): ExtractionResultMetadata {
  return isRecord(value) ? (value as ExtractionResultMetadata) : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
