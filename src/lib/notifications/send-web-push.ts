import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { PushSubscriptionRow } from "@/lib/supabase/database.types";

interface SendWebPushToUserInput {
  userId: string;
  title: string;
  body?: string | null;
  link?: string | null;
  notificationId?: string;
  previewAllowed?: boolean;
}

export interface WebPushSummary {
  sent: number;
  failed: number;
  deletedInvalid: number;
}

interface WebPushPayloadInput {
  title?: string | null;
  body?: string | null;
  link?: string | null;
  notificationId?: string;
  previewAllowed?: boolean;
}

interface WebPushPayload {
  title: string;
  body: string;
  link: string;
  notificationId?: string;
}

export function buildWebPushPayload(
  input: WebPushPayloadInput
): WebPushPayload {
  if (!input.previewAllowed) {
    return {
      title: "ChemVault",
      body: "You have a new notification.",
      link: "/notifications",
      notificationId: input.notificationId,
    };
  }

  return {
    title: input.title || "ChemVault",
    body: input.body || "You have a new notification.",
    link: input.link || "/notifications",
    notificationId: input.notificationId,
  };
}

export async function sendWebPushToUser({
  userId,
  title,
  body,
  link,
  notificationId,
  previewAllowed,
}: SendWebPushToUserInput): Promise<WebPushSummary> {
  const summary: WebPushSummary = {
    sent: 0,
    failed: 0,
    deletedInvalid: 0,
  };

  if (!userId || !hasVapidConfig()) {
    return summary;
  }

  const supabase = createSupabaseAdminClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId);

  if (error || !subscriptions?.length) {
    return summary;
  }

  const webPush = await loadWebPush();

  if (!webPush) {
    return summary;
  }

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:admin@chemvault.science",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? ""
  );

  const payload = JSON.stringify(
    buildWebPushPayload({
      title,
      body,
      link,
      notificationId,
      previewAllowed,
    })
  );

  for (const subscription of subscriptions) {
    try {
      await webPush.sendNotification(toWebPushSubscription(subscription), payload);
      summary.sent += 1;
    } catch (sendError) {
      summary.failed += 1;

      if (isInvalidPushSubscriptionError(sendError)) {
        await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id);
        summary.deletedInvalid += 1;
      }
    }
  }

  return summary;
}

async function loadWebPush() {
  try {
    const webPushModule = await import("web-push");
    return webPushModule.default;
  } catch {
    return null;
  }
}

export function isInvalidPushSubscriptionError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;
  return statusCode === 404 || statusCode === 410;
}

function hasVapidConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  );
}

function toWebPushSubscription(subscription: PushSubscriptionRow) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };
}
