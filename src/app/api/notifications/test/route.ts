import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { notify } from "@/lib/notifications/notify";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }

    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const notification = await notify({
      userId: user.id,
      title: "Test notification",
      body: "System notifications are working correctly.",
      type: "success",
      source: "system",
      link: "/notifications",
      metadata: {
        pushPreviewAllowed: true,
      },
    });

    return NextResponse.json({ notification }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to send test notification.");
  }
}
