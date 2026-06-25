import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { archiveFeatureUpdate } from "@/lib/feature-updates/archive-feature-update";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdminUser();
    const params = await context.params;
    const update = await archiveFeatureUpdate({
      updateId: params.id,
      actorId: user.id,
    });

    return NextResponse.json({ update });
  } catch (error) {
    return jsonError(error, "Failed to archive feature update.");
  }
}
