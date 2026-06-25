import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError } from "@/lib/api/responses";
import { isAdminEmail } from "@/lib/auth/require-admin";
import {
  createSupabaseFeatureUpdateStore,
  normalizeVisibleFeatureUpdateFilters,
} from "@/lib/feature-updates/feature-update-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedSupabase();
    const filters = normalizeVisibleFeatureUpdateFilters(
      request.nextUrl.searchParams
    );
    const updates = await createSupabaseFeatureUpdateStore().listVisibleUpdates({
      ...filters,
      userId: user?.id,
      isAdmin: isAdminEmail(user?.email),
    });

    return NextResponse.json({ updates });
  } catch (error) {
    return jsonError(error, "Failed to load feature updates.");
  }
}
