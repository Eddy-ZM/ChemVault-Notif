import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { verifyApiKey } from "@/lib/api-keys/verify-api-key";
import { createWebhookEvent } from "@/lib/webhooks/create-webhook-event";
import { processWebhookEvent } from "@/lib/webhooks/process-webhook-event";
import { isWebhookEventType } from "@/lib/webhooks/transform";
import { NotificationError } from "@/lib/notifications/errors";
import type {
  ApiKeyScope,
  ServiceApiKeyIdentity,
  WebhookPayload,
} from "@/types/webhooks";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  let eventId: string | undefined;

  try {
    const rawKey = bearerToken(request);
    const body = await parseJson(request);
    const eventType = eventTypeValue(body);
    const source = stringValue(body, "source");

    if (!isWebhookEventType(eventType)) {
      throw new NotificationError("Invalid webhook event type.", undefined, 400);
    }

    if (!source) {
      throw new NotificationError("source is required.", undefined, 400);
    }

    const identity = await verifyApiKey(rawKey, requiredScope(eventType));
    const payload = payloadValue(body);

    if (
      identity.allowedSources.length > 0 &&
      !identity.allowedSources.includes(source)
    ) {
      throw new NotificationError(
        "API key is not allowed to send this source.",
        undefined,
        403
      );
    }

    assertWebhookBroadcastScope(eventType, payload, identity);

    const event = await createWebhookEvent({
      serviceName: identity.serviceName,
      source,
      eventType,
      userId: optionalStringValue(body, "userId"),
      projectId: optionalStringValue(body, "projectId"),
      taskId: optionalStringValue(body, "taskId"),
      conversationId: optionalStringValue(body, "conversationId"),
      payload,
      idempotencyKey: optionalStringValue(body, "idempotencyKey"),
    });
    eventId = event.id;

    if (event.idempotencyKey && event.status !== "received") {
      return NextResponse.json({
        success: event.status === "processed",
        eventId: event.id,
        status: event.status,
        idempotent: true,
      }, { status: event.status === "failed" ? 500 : 200 });
    }

    const processed = await processWebhookEvent(event.id);

    return NextResponse.json({
      success: true,
      eventId: processed.id,
      status: processed.status,
    });
  } catch (error) {
    if (eventId) {
      const status =
        error instanceof NotificationError ? error.statusCode : 500;

      return NextResponse.json(
        {
          success: false,
          eventId,
          error:
            error instanceof Error
              ? error.message
              : "Failed to process webhook event.",
        },
        { status }
      );
    }

    return jsonError(error, "Failed to receive ChemVault webhook.");
  }
}

function assertWebhookBroadcastScope(
  eventType: string,
  payload: WebhookPayload,
  identity: ServiceApiKeyIdentity
) {
  if (eventType !== "admin.broadcast" || !isAllUsersBroadcastPayload(payload)) {
    return;
  }

  if (!identity.scopes.includes("admin:broadcast:all")) {
    throw new NotificationError(
      "admin:broadcast:all scope is required for all-user broadcasts.",
      undefined,
      403
    );
  }
}

function isAllUsersBroadcastPayload(payload: WebhookPayload): boolean {
  if (payload.targetType === "all_users") {
    return true;
  }

  if (
    isRecord(payload.targetPayload) &&
    payload.targetPayload.targetType === "all_users"
  ) {
    return true;
  }

  return false;
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function bearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);

  if (!match) {
    throw new NotificationError("Missing bearer API key.", undefined, 401);
  }

  return match[1].trim();
}

function requiredScope(eventType: string): ApiKeyScope {
  switch (eventType) {
    case "notification.created":
      return "notifications:create";
    case "task.status_changed":
      return "tasks:update";
    case "message.created":
      return "messages:create";
    case "admin.broadcast":
      return "admin:broadcast";
    case "file.uploaded":
      return "files:create";
    case "file.status_changed":
      return "files:update";
    case "result.created":
      return "results:create";
    case "feature_update.published":
      return "feature_updates:publish";
    default:
      return "webhooks:send";
  }
}

function eventTypeValue(body: unknown): string {
  return isRecord(body) && typeof body.eventType === "string"
    ? body.eventType
    : "";
}

function stringValue(body: unknown, field: string): string {
  if (!isRecord(body)) {
    return "";
  }

  const value = body[field];
  return typeof value === "string" ? value.trim() : "";
}

function optionalStringValue(body: unknown, field: string): string | null {
  const value = stringValue(body, field);
  return value || null;
}

function payloadValue(body: unknown): WebhookPayload {
  if (!isRecord(body) || !isRecord(body.payload)) {
    return {};
  }

  return body.payload as WebhookPayload;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
