"use client";

import { Bell, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChemVaultNotification } from "@/lib/notifications/types";
import { NotificationItem } from "./NotificationItem";

interface NotificationDropdownProps {
  notifications: ChemVaultNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onSelect: (notification: ChemVaultNotification) => void;
  onMarkAllRead: () => void;
  onViewAll: () => void;
}

export function NotificationDropdown({
  notifications,
  unreadCount,
  loading,
  error,
  onSelect,
  onMarkAllRead,
  onViewAll,
}: NotificationDropdownProps) {
  return (
    <div className="w-[min(calc(100vw-2rem),28rem)]">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "No unread updates"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onMarkAllRead}
          disabled={unreadCount === 0}
        >
          <CheckCheck data-icon="inline-start" />
          Mark all
        </Button>
      </div>
      <Separator />
      {loading ? (
        <div className="flex flex-col gap-3 p-4">
          <NotificationSkeleton />
          <NotificationSkeleton />
          <NotificationSkeleton />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Bell className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">Notifications unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <Bell className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-sm text-muted-foreground">
            New ChemVault task updates and announcements will appear here.
          </p>
        </div>
      ) : (
        <ScrollArea className="max-h-[24rem]">
          <div className="flex flex-col gap-1 p-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onSelect={onSelect}
                compact
              />
            ))}
          </div>
        </ScrollArea>
      )}
      <Separator />
      <div className="p-2">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-center"
          onClick={onViewAll}
        >
          View all notifications
          <ExternalLink data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="flex gap-3">
      <Skeleton className="size-9 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}
