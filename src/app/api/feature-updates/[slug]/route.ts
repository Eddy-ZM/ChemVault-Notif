import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError } from "@/lib/api/responses";
import { isChemVaultAdminUser } from "@/lib/auth/require-admin";
import { canViewFeatureUpdate } from "@/lib/feature-updates/can-view-feature-update";
import { createSupabaseFeatureUpdateStore } from "@/lib/feature-updates/feature-update-store";
import { NotificationError } from "@/lib/notifications/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { user } = await getAuthenticatedSupabase();
    const params = await context.params;
    const store = createSupabaseFeatureUpdateStore();
    const update = await store.getUpdateBySlug(params.slug);

    if (
      !update ||
      !(await canViewFeatureUpdate({
        update,
        userId: user?.id,
        isAdmin: isChemVaultAdminUser(user),
        store,
      }))
    ) {
      throw new NotificationError("Feature update not found.", undefined, 404);
    }

    return NextResponse.json({ update });
  } catch (error) {
    return jsonError(error, "Failed to load feature update.");
  }
}
