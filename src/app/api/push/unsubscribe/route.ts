import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { parseUnsubscribeBody } from "@/lib/notifications/push-subscriptions";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { endpoint } = parseUnsubscribeBody(await parseJson(request));
    let query = supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", user.id);

    if (endpoint) {
      query = query.eq("endpoint", endpoint);
    }

    const { error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to remove push subscription.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
