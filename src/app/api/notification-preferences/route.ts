import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import {
  ensureDefaultNotificationPreferences,
  getUserNotificationPreferences,
  setNotificationPreference,
} from "@/lib/notifications/preferences";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  type NotificationChannel,
} from "@/types/notification-preferences";
import type { NotificationCategory } from "@/types/notification-preferences";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    await ensureDefaultNotificationPreferences(user.id);

    return NextResponse.json({
      preferences: await getUserNotificationPreferences(user.id),
    });
  } catch (error) {
    return jsonError(error, "Failed to load notification preferences.");
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const body = await parseJson(request);
    const category = stringValue(body.category);
    const channel = stringValue(body.channel);
    const enabled = parseBoolean(body.enabled);

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 }
      );
    }

    if (!isValidChannel(channel)) {
      return NextResponse.json(
        { error: "Invalid channel." },
        { status: 400 }
      );
    }

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "enabled must be a boolean." }, {
        status: 400,
      });
    }

    const preference = await setNotificationPreference({
      userId: user.id,
      category,
      channel,
      enabled,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorType: "user",
      action: "user.preference_updated",
      entityType: "user_notification_preferences",
      entityId: preference.id,
      userId: user.id,
      source: "settings",
      severity: "info",
      visibility: "admin",
      title: "Notification preference updated",
      metadata: {
        category,
        channel,
        enabled,
      },
    });

    return NextResponse.json({ preference });
  } catch (error) {
    return jsonError(error, "Failed to update notification preference.");
  }
}

async function parseJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return isRecord(body) ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function isValidCategory(value: string): value is NotificationCategory {
  return (NOTIFICATION_CATEGORIES as readonly string[]).includes(value);
}

function isValidChannel(value: string): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseBoolean(value: unknown): boolean | undefined {
  if (value === true || value === false) {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
