import { NotificationError } from "./errors";

export interface ParsedPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export function parsePushSubscriptionBody(
  body: unknown
): ParsedPushSubscription {
  if (!isRecord(body)) {
    throw new NotificationError(
      "Push subscription endpoint is required.",
      undefined,
      400
    );
  }

  const endpoint = stringValue(body.endpoint);
  const keys = isRecord(body.keys) ? body.keys : {};
  const p256dh = stringValue(keys.p256dh);
  const auth = stringValue(keys.auth);

  if (!endpoint) {
    throw new NotificationError(
      "Push subscription endpoint is required.",
      undefined,
      400
    );
  }

  if (!p256dh) {
    throw new NotificationError(
      "Push subscription p256dh key is required.",
      undefined,
      400
    );
  }

  if (!auth) {
    throw new NotificationError(
      "Push subscription auth key is required.",
      undefined,
      400
    );
  }

  return {
    endpoint,
    p256dh,
    auth,
  };
}

export function parseUnsubscribeBody(body: unknown): { endpoint?: string } {
  if (!isRecord(body)) {
    return {};
  }

  const endpoint = stringValue(body.endpoint);
  return endpoint ? { endpoint } : {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
