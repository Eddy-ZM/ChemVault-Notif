import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { createSupabaseMessageStore } from "@/lib/messages/message-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const conversations =
      await createSupabaseMessageStore().listConversationSummaries(user.id);

    return NextResponse.json({ conversations });
  } catch (error) {
    return jsonError(error, "Failed to load conversations.");
  }
}
