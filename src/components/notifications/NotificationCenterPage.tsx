"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  ChemVaultNotification,
  NotificationType,
} from "@/lib/notifications/types";
import { notificationTypes } from "@/lib/notifications/transform";
import { NotificationItem } from "./NotificationItem";

type ReadFilter = "all" | "read" | "unread";

interface NotificationResponse {
  notifications: ChemVaultNotification[];
  unreadCount: number;
}

const sourceOptions = [
  "all",
  "chemvault-app",
  "chemvault-files",
  "chemvault-docs",
  "ai-extractor",
  "admin",
  "system",
] as const;

export function NotificationCenterPage() {
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [sourceFilter, setSourceFilter] =
    useState<(typeof sourceOptions)[number]>("all");
  const [notifications, setNotifications] = useState<ChemVaultNotification[]>(
    []
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      limit: "100",
      read: readFilter,
    });

    if (typeFilter !== "all") {
      params.set("type", typeFilter);
    }

    if (sourceFilter !== "all") {
      params.set("source", sourceFilter);
    }

    return params.toString();
  }, [readFilter, sourceFilter, typeFilter]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/notifications?${query}`, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to view notifications."
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
  }, [query]);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/notifications?${query}`, {
      credentials: "same-origin",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to view notifications."
              : "Unable to load notifications."
          );
        }

        return (await response.json()) as NotificationResponse;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }

        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
        setError(null);
      })
      .catch((fetchError: unknown) => {
        if (cancelled) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load notifications."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [query]);

  async function markAsRead(notification: ChemVaultNotification) {
    if (notification.read) {
      if (notification.link) {
        navigate(notification.link);
      }
      return;
    }

    const response = await fetch(`/api/notifications/${notification.id}/read`, {
      method: "PATCH",
      credentials: "same-origin",
    });

    if (!response.ok) {
      toast.error("Unable to mark notification as read.");
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id ? { ...item, read: true } : item
      )
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    if (notification.link) {
      navigate(notification.link);
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
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Bell className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Notification Center
              </h1>
              <p className="text-sm text-muted-foreground">
                Task results, system notices, and ChemVault service updates.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{unreadCount} unread</Badge>
            <Button
              type="button"
              variant="outline"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw data-icon="inline-start" />
              Refresh
            </Button>
            <Button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              <CheckCheck data-icon="inline-start" />
              Mark all as read
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inbox</CardTitle>
            <CardDescription>
              Filter notifications by status, type, and source service.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-[1fr_12rem_13rem]">
              <Tabs
                value={readFilter}
                onValueChange={(value) => {
                  setLoading(true);
                  setReadFilter(value as ReadFilter);
                }}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread">Unread</TabsTrigger>
                  <TabsTrigger value="read">Read</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setLoading(true);
                  setTypeFilter(value as NotificationType | "all");
                }}
              >
                <SelectTrigger aria-label="Filter by type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all">All types</SelectItem>
                    {notificationTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Select
                value={sourceFilter}
                onValueChange={(value) => {
                  setLoading(true);
                  setSourceFilter(value as (typeof sourceOptions)[number]);
                }}
              >
                <SelectTrigger aria-label="Filter by source">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {sourceOptions.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source === "all" ? "All sources" : source}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                <ListSkeleton />
                <ListSkeleton />
                <ListSkeleton />
              </div>
            ) : error ? (
              <StateMessage
                title="Unable to load notifications"
                description={error}
              />
            ) : notifications.length === 0 ? (
              <StateMessage
                title="No notifications found"
                description="Change filters or wait for new ChemVault service updates."
              />
            ) : (
              <div className="flex flex-col gap-2">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onSelect={markAsRead}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function ListSkeleton() {
  return (
    <div className="flex gap-3 rounded-md border bg-card p-3">
      <Skeleton className="size-9 rounded-md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

function StateMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-14 text-center">
      <Bell className="size-9 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function navigate(link: string) {
  if (link.startsWith("/")) {
    window.location.assign(link);
  } else {
    window.location.href = link;
  }
}
