import { NextRequest, NextResponse } from "next/server";
import { parseChemVaultEvent } from "@/lib/events/contract";
import { notify } from "@/lib/notifications/notify";
import { createWebhookEvent } from "@/lib/webhooks/create-webhook-event";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { WebhookPayload } from "@/types/webhooks";

export async function POST(request: NextRequest) {
  if (!process.env.EVENT_INGRESS_SECRET || request.headers.get("x-chemvault-event-key") !== process.env.EVENT_INGRESS_SECRET) {
    return NextResponse.json({ error: "Invalid event ingress key." }, { status: 401 });
  }

  try {
    const event = parseChemVaultEvent(await request.json());
    const webhookEvent = await createWebhookEvent({
      serviceName: event.source,
      source: event.source,
      eventType: event.type,
      userId: event.user.id,
      taskId: event.data.analysisId || event.data.fileId || event.data.ticketId,
      payload: event as unknown as WebhookPayload,
      idempotencyKey: event.id,
    });
    if (webhookEvent.status === "processed") {
      return NextResponse.json({ accepted: true, duplicate: true, eventId: event.id });
    }

    const notification = await notify({
      userId: event.user.id,
      title: event.data.title,
      body: event.data.summary,
      type: event.type.endsWith("failed") ? "error" : event.source === "chemvault-forms" ? "system" : "success",
      source: event.source,
      link: event.data.deepLink,
      metadata: {
        eventId: event.id,
        eventType: event.type,
        subject: event.subject,
        ...(event.data.analysisId ? { analysisId: event.data.analysisId } : {}),
        ...(event.data.fileId ? { fileId: event.data.fileId } : {}),
        ...(typeof event.data.fileCount === "number" ? { fileCount: event.data.fileCount } : {}),
        ...(event.data.artifactLinks ? { artifactLinks: event.data.artifactLinks } : {}),
        ...(event.data.ticketId ? { ticketId: event.data.ticketId } : {}),
        ...(event.data.priority ? { priority: event.data.priority } : {}),
        pushPreviewAllowed: true,
      },
    });

    await createSupabaseAdminClient()
      .from("webhook_events")
      .update({ status: "processed", processed_at: new Date().toISOString(), error_message: null })
      .eq("id", webhookEvent.id);
    return NextResponse.json({ accepted: true, eventId: event.id, notificationId: notification?.id || null }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Event ingestion failed." },
      { status: 400 },
    );
  }
}
