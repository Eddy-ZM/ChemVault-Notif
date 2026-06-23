"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, RadioTower } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ActivityEventItem } from "@/components/activity/ActivityEventItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  Database,
  ProjectActivityEventRow,
} from "@/lib/supabase/database.types";
import { toProjectActivityEvent } from "@/lib/audit/transform";
import type { ProjectActivityEvent } from "@/types/audit";

type ActivityFilter = "all" | "files" | "extraction" | "messages" | "system";

interface ProjectActivityTimelineProps {
  projectId: string;
  initialEvents?: ProjectActivityEvent[];
}

export function ProjectActivityTimeline({
  projectId,
  initialEvents = [],
}: ProjectActivityTimelineProps) {
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [events, setEvents] = useState<ProjectActivityEvent[]>(initialEvents);
  const [filter, setFilter] = useState<ActivityFilter>("all");
  const [loading, setLoading] = useState(initialEvents.length === 0);
  const [error, setError] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createSupabaseBrowserClient();
    return supabaseRef.current;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/activity`, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Project activity is available to project members."
            : "Unable to load project activity."
        );
      }

      const data = (await response.json()) as {
        events: ProjectActivityEvent[];
      };
      setEvents(data.events);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Unable to load project activity."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      await refresh();

      if (cancelled) {
        return;
      }

      try {
        const supabase = getSupabase();
        const channel = supabase
          .channel(`project-activity:${projectId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "project_activity_events",
              filter: `project_id=eq.${projectId}`,
            },
            (payload) => {
              const event = toProjectActivityEvent(
                payload.new as ProjectActivityEventRow
              );
              setEvents((current) => mergeEvent(event, current));
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        if (!cancelled) {
          setError("Realtime activity updates are unavailable.");
        }
      }
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [getSupabase, projectId, refresh]);

  const filteredEvents = useMemo(
    () => events.filter((event) => matchesFilter(event, filter)),
    [events, filter]
  );
  const groups = useMemo(() => groupEventsByDate(filteredEvents), [filteredEvents]);

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Project activity</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Structured project events, workflow updates, and workspace messages.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            void refresh();
          }}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Tabs
          value={filter}
          onValueChange={(value) => setFilter(value as ActivityFilter)}
        >
          <TabsList className="flex h-auto flex-wrap justify-start">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="extraction">Extraction</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <ActivitySkeleton />
        ) : error ? (
          <StateMessage title="Unable to load activity" description={error} />
        ) : filteredEvents.length === 0 ? (
          <StateMessage
            title="No activity yet"
            description="Project workflow events will appear here as work happens."
          />
        ) : (
          <ScrollArea className="max-h-[68vh] pr-3">
            <div className="flex flex-col gap-6">
              {groups.map((group) => (
                <section key={group.label} className="flex flex-col gap-2">
                  <div className="sticky top-0 bg-card py-1 text-xs font-medium uppercase tracking-normal text-muted-foreground">
                    {group.label}
                  </div>
                  <div className="flex flex-col gap-1">
                    {group.events.map((event) => (
                      <ActivityEventItem key={event.id} event={event} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function mergeEvent(
  event: ProjectActivityEvent,
  events: ProjectActivityEvent[]
): ProjectActivityEvent[] {
  if (events.some((item) => item.id === event.id)) {
    return events;
  }

  return [event, ...events].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function matchesFilter(
  event: ProjectActivityEvent,
  filter: ActivityFilter
): boolean {
  switch (filter) {
    case "files":
      return event.eventType.startsWith("file.");
    case "extraction":
      return (
        event.eventType.startsWith("extraction.") ||
        event.eventType.startsWith("extraction_result.")
      );
    case "messages":
      return event.eventType.startsWith("message.");
    case "system":
      return (
        event.actorType === "system" ||
        event.eventType.startsWith("notification.") ||
        event.eventType.startsWith("webhook.") ||
        event.eventType.startsWith("broadcast.")
      );
    default:
      return true;
  }
}

function groupEventsByDate(events: ProjectActivityEvent[]) {
  const groups = new Map<string, ProjectActivityEvent[]>();

  for (const event of events) {
    const label = formatDateGroup(event.createdAt);
    groups.set(label, [...(groups.get(label) ?? []), event]);
  }

  return Array.from(groups.entries()).map(([label, groupEvents]) => ({
    label,
    events: groupEvents,
  }));
}

function formatDateGroup(value: string): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(new Date(value));
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
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
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
      <RadioTower className="size-9 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
