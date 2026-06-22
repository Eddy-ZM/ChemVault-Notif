import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ChemVaultNotification } from "@/lib/notifications/types";
import { formatRelativeTime } from "./time";
import { NotificationIcon } from "./NotificationIcon";

interface NotificationItemProps {
  notification: ChemVaultNotification;
  onSelect?: (notification: ChemVaultNotification) => void;
  compact?: boolean;
}

export function NotificationItem({
  notification,
  onSelect,
  compact = false,
}: NotificationItemProps) {
  return (
    <button
      type="button"
      className={cn(
        "group flex w-full gap-3 rounded-md px-3 py-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        !notification.read && "bg-accent/45",
        compact && "px-2 py-2.5"
      )}
      onClick={() => onSelect?.(notification)}
    >
      <NotificationIcon type={notification.type} />
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span
            className={cn(
              "line-clamp-2 text-sm font-medium leading-5 text-foreground",
              !notification.read && "font-semibold"
            )}
          >
            {notification.title}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </span>
        {notification.body ? (
          <span className="mt-1 line-clamp-2 text-sm leading-5 text-muted-foreground">
            {notification.body}
          </span>
        ) : null}
        <span className="mt-2 flex flex-wrap items-center gap-2">
          {notification.source ? (
            <Badge variant="secondary" className="max-w-44 truncate">
              {notification.source}
            </Badge>
          ) : null}
          {!notification.read ? (
            <span className="size-2 rounded-full bg-primary" aria-label="Unread" />
          ) : null}
        </span>
      </span>
    </button>
  );
}
