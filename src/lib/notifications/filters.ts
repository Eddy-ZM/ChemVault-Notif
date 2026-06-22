import { isNotificationType } from "./transform";
import type { NotificationType } from "./types";

export type NotificationReadFilter = "all" | "read" | "unread";

export interface NotificationQuery {
  limit: number;
  read: NotificationReadFilter;
  source: string | null;
  type: NotificationType | null;
}

export function parseNotificationQuery(
  searchParams: URLSearchParams
): NotificationQuery {
  const unreadOnly = searchParams.get("unreadOnly");
  const readParam = searchParams.get("read");

  return {
    limit: parseLimit(searchParams.get("limit")),
    read:
      unreadOnly === "true"
        ? "unread"
        : readParam === "read" || readParam === "unread"
          ? readParam
          : "all",
    source: parseSource(searchParams.get("source")),
    type: parseType(searchParams.get("type")),
  };
}

function parseLimit(rawLimit: string | null): number {
  if (!rawLimit) {
    return 30;
  }

  const parsed = Number.parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed)) {
    return 30;
  }

  return Math.min(Math.max(parsed, 1), 100);
}

function parseSource(rawSource: string | null): string | null {
  if (!rawSource) {
    return null;
  }

  const source = rawSource.trim();
  if (!source || source.length > 80) {
    return null;
  }

  return /^[a-zA-Z0-9._:-]+$/.test(source) ? source : null;
}

function parseType(rawType: string | null): NotificationType | null {
  return isNotificationType(rawType) ? rawType : null;
}
