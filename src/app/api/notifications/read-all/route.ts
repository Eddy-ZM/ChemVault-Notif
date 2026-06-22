import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function PATCH() {
  try {
    const { supabase, user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
      .select("id");

    if (error) {
      throw error;
    }

    return NextResponse.json({
      updatedCount: data?.length ?? 0,
    });
  } catch (error) {
    return jsonError(error, "Failed to mark notifications as read.");
  }
}
