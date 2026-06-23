import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { markConversationRead } from "@/lib/messages/mark-conversation-read";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const result = await markConversationRead({
      conversationId,
      userId: user.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return jsonError(error, "Failed to mark conversation as read.");
  }
}
