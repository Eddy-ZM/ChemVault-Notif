import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertResultAccess } from "@/lib/results/access";
import { approveResult } from "@/lib/results/approve-result";
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
    const dataset = await approveResult(
      {
        resultId,
        userId: user.id,
        comment: optionalString(body.comment),
      },
      { store }
    );
    const result = await store.getResult(resultId);

    return NextResponse.json({ dataset, result });
  } catch (error) {
    return jsonError(error, "Failed to approve extraction result.");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
