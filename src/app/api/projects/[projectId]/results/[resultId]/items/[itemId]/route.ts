import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertProjectResultAccess } from "@/lib/results/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";
import { updateResultItem } from "@/lib/results/update-result-item";
import type { Json } from "@/lib/supabase/database.types";
import type { ResultItemStatus } from "@/types/results";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{ projectId: string; resultId: string; itemId: string }>;
  }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { projectId, resultId, itemId } = await context.params;
    const store = createSupabaseResultStore();
    await assertProjectResultAccess({ projectId, resultId, user, store });
    const existingItem = await store.getResultItem(itemId);

    if (!existingItem || existingItem.resultId !== resultId) {
      return NextResponse.json(
        { error: "Result item not found in this result." },
        { status: 404 }
      );
    }

    const body = await parseJson(request);
    const item = await updateResultItem(
      {
        resultItemId: itemId,
        reviewerId: user.id,
        status: stringValue(body.status) as ResultItemStatus,
        newValue: body.value as Json | undefined,
        reviewerNote: optionalString(body.reviewerNote) ?? optionalString(body.comment),
        reason: optionalString(body.reason),
      },
      { store }
    );

    return NextResponse.json({ item });
  } catch (error) {
    return jsonError(error, "Failed to update result item.");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
