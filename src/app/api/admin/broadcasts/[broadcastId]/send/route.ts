import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { sendBroadcast } from "@/lib/broadcasts/send-broadcast";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ broadcastId: string }> }
) {
  try {
    const { user } = await requireAdminUser();
    const { broadcastId } = await context.params;
    const summary = await sendBroadcast({
      broadcastId,
      actorId: user.id,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    return jsonError(error, "Failed to send broadcast.");
  }
}
