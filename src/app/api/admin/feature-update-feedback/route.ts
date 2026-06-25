import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseFeatureUpdateStore } from "@/lib/feature-updates/feature-update-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
    const feedback = await createSupabaseFeatureUpdateStore().listFeedback({
      featureUpdateId: request.nextUrl.searchParams.get("updateId"),
      status: request.nextUrl.searchParams.get("status"),
      limit: numberValue(request.nextUrl.searchParams.get("limit")),
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    return jsonError(error, "Failed to load feature update feedback.");
  }
}

function numberValue(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
