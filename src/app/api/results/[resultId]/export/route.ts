import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertResultAccess } from "@/lib/results/access";
import { exportResult } from "@/lib/results/export-result";
import { createSupabaseResultStore } from "@/lib/results/result-store";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ resultId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { resultId } = await context.params;
    const store = createSupabaseResultStore();
    await assertResultAccess({ resultId, user, store });

    const body = await parseJson(request);
    const exportRecord = await exportResult(
      {
        resultId,
        userId: user.id,
        exportType: stringValue(body.exportType),
      },
      { store }
    );

    return NextResponse.json({ export: exportRecord }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to export extraction result.");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
