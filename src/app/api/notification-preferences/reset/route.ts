import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import {
  getUserNotificationPreferences,
  resetUserNotificationPreferences,
} from "@/lib/notifications/preferences";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    await resetUserNotificationPreferences(user.id);

    await logAuditEvent({
      actorUserId: user.id,
      actorType: "user",
      action: "user.preference_updated",
      entityType: "user_notification_preferences",
      userId: user.id,
      source: "settings",
      severity: "info",
      visibility: "admin",
      title: "Notification preferences reset",
      metadata: {
        resetToDefaults: true,
      },
    });

    return NextResponse.json({
      preferences: await getUserNotificationPreferences(user.id),
    });
  } catch (error) {
    return jsonError(error, "Failed to reset notification preferences.");
  }
}
