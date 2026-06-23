import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { assertResultItemAccess } from "@/lib/results/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";
import { updateResultItem } from "@/lib/results/update-result-item";
import type { Json } from "@/lib/supabase/database.types";
import type { ExtractionResultItemStatus } from "@/types/extraction-results";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ itemId: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { itemId } = await context.params;
    const store = createSupabaseResultStore();
    await assertResultItemAccess({ itemId, user, store });

    const body = await parseJson(request);
    const item = await updateResultItem(
      {
        itemId,
        userId: user.id,
        value: body.value as Json | undefined,
        status: stringValue(body.status) as ExtractionResultItemStatus,
        comment: optionalString(body.comment),
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
