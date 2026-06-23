"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState } from "react";
import {
  Archive,
  CheckCircle2,
  CircleDot,
  FileText,
  FlaskConical,
  Trash2,
  XCircle,
} from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatRelativeTime } from "@/components/notifications/time";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database, FileEventRow } from "@/lib/supabase/database.types";
import { toFileEvent } from "@/lib/files/transform";
import type { FileEvent } from "@/types/files";

interface FileProcessingTimelineProps {
  projectId: string;
  fileId: string;
  initialEvents: FileEvent[];
}

export function FileProcessingTimeline({
  projectId,
  fileId,
  initialEvents,
}: FileProcessingTimelineProps) {
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [events, setEvents] = useState(initialEvents);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      try {
        const supabase = createSupabaseBrowserClient();
        supabaseRef.current = supabase;
        const channel = supabase
          .channel(`file-events:${fileId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "file_events",
              filter: `file_id=eq.${fileId}`,
            },
            (payload) => {
              const event = toFileEvent(payload.new as FileEventRow);
              setEvents((current) => mergeEvent(event, current));
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        if (!cancelled) {
          setError("Realtime file events are unavailable.");
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
  }, [fileId]);

  if (events.length === 0) {
    return (
      <div className="rounded-md border border-dashed px-4 py-10 text-center">
        <p className="text-sm font-medium">No file events yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload and processing events will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? <p className="text-sm text-muted-foreground">{error}</p> : null}
      <ScrollArea className="max-h-[32rem] pr-3">
        <div className="flex flex-col gap-1">
          {events.map((event) => (
            <TimelineItem key={event.id} projectId={projectId} event={event} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function TimelineItem({
  projectId,
  event,
}: {
  projectId: string;
  event: FileEvent;
}) {
  const extractionTaskId =
    typeof event.metadata.extractionTaskId === "string"
      ? event.metadata.extractionTaskId
      : null;

  return (
    <article className="flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/60">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border bg-background">
        <EventIcon event={event} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{event.title}</p>
          <Badge
            variant={
              event.severity === "error" || event.severity === "critical"
                ? "destructive"
                : "secondary"
            }
          >
            {event.severity}
          </Badge>
        </div>
        {event.description ? (
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {event.description}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{event.eventType}</span>
          <span aria-hidden="true">·</span>
          <span>{formatRelativeTime(event.createdAt)}</span>
          {extractionTaskId ? (
            <>
              <span aria-hidden="true">·</span>
              <Link
                href={`/projects/${projectId}/tasks/${extractionTaskId}` as Route}
                className="hover:underline"
              >
                extraction task
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function EventIcon({ event }: { event: FileEvent }) {
  if (event.eventType === "file.deleted") {
    return <Trash2 className="size-4 text-muted-foreground" />;
  }

  if (event.eventType === "file.archived") {
    return <Archive className="size-4 text-muted-foreground" />;
  }

  if (event.severity === "success") {
    return <CheckCircle2 className="size-4 text-primary" />;
  }

  if (event.severity === "error" || event.severity === "critical") {
    return <XCircle className="size-4 text-destructive" />;
  }

  if (event.eventType.includes("extraction")) {
    return <FlaskConical className="size-4 text-muted-foreground" />;
  }

  if (event.eventType === "file.uploaded") {
    return <FileText className="size-4 text-muted-foreground" />;
  }

  return <CircleDot className="size-4 text-muted-foreground" />;
}

function mergeEvent(event: FileEvent, events: FileEvent[]) {
  if (events.some((item) => item.id === event.id)) {
    return events;
  }

  return [...events, event].sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}
