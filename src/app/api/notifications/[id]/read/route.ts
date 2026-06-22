import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { toChemVaultNotification } from "@/lib/notifications/transform";

export const dynamic = "force-dynamic";

export async function PATCH(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { supabase, user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Notification not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      notification: toChemVaultNotification(data),
    });
  } catch (error) {
    return jsonError(error, "Failed to mark notification as read.");
  }
}
