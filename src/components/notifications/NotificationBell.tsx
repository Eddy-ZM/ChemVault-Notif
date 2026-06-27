"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Database, NotificationRow } from "@/lib/supabase/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { fetchCurrentUser } from "@/lib/user-system/client";
import type { ChemVaultNotification } from "@/lib/notifications/types";
import { toChemVaultNotification } from "@/lib/notifications/transform";
import { NotificationDropdown } from "./NotificationDropdown";

interface NotificationResponse {
  notifications: ChemVaultNotification[];
  unreadCount: number;
}

export function NotificationBell() {
  const router = useRouter();
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ChemVaultNotification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createSupabaseBrowserClient();
    return supabaseRef.current;
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { user } = await fetchCurrentUser();

      if (!user) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      const response = await fetch("/api/notifications?limit=10", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to view updates."
            : "Unable to load notifications."
        );
      }

      const data = (await response.json()) as NotificationResponse;
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      await refresh();

      try {
        const { user } = await fetchCurrentUser();

        if (cancelled || !user) {
          return;
        }

        const supabase = getSupabase();
        const channel = supabase
          .channel(`notifications:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${user.id}`,
            },
            (payload) => {
              const notification = toChemVaultNotification(
                payload.new as NotificationRow
              );

              setNotifications((current) =>
                [
                  notification,
                  ...current.filter((item) => item.id !== notification.id),
                ].slice(0, 10)
              );
              setUnreadCount((current) => current + 1);
              toast(notification.title, {
                description:
                  notification.body ?? notification.source ?? "New notification",
              });
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        if (!cancelled) {
          setError("Realtime is unavailable. Check Supabase public env vars.");
        }
      }
    }

    subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [getSupabase, refresh]);

  async function markAsRead(notification: ChemVaultNotification) {
    if (!notification.read) {
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: "PATCH",
        credentials: "same-origin",
      });

      if (response.ok) {
        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, read: true } : item
          )
        );
        setUnreadCount((current) => Math.max(0, current - 1));
      }
    }

    setOpen(false);

    if (notification.link) {
      window.location.assign(notification.link);
    }
  }

  async function markAllAsRead() {
    const response = await fetch("/api/notifications/read-all", {
      method: "PATCH",
      credentials: "same-origin",
    });

    if (!response.ok) {
      toast.error("Unable to mark notifications as read.");
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="relative"
          aria-label="Open notifications"
        >
          <Bell data-icon="inline-start" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="p-0" sideOffset={10}>
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          onSelect={markAsRead}
          onMarkAllRead={markAllAsRead}
          onViewAll={() => {
            setOpen(false);
            router.push("/notifications");
          }}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
