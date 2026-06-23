"use client";

import Link from "next/link";
import type { Route } from "next";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/components/notifications/time";
import type { ProjectActivityEvent } from "@/types/audit";
import { ActivityEventIcon } from "./ActivityEventIcon";

interface ActivityEventItemProps {
  event: ProjectActivityEvent;
}

export function ActivityEventItem({ event }: ActivityEventItemProps) {
  const href = relatedHref(event);

  return (
    <article className="flex gap-3 rounded-md px-2 py-3 transition-colors hover:bg-accent/60">
      <ActivityEventIcon event={event} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {href ? (
            <Link href={href as Route} className="font-medium hover:underline">
              {event.title}
            </Link>
          ) : (
            <p className="font-medium">{event.title}</p>
          )}
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
        </div>
      </div>
    </article>
  );
}

function relatedHref(event: ProjectActivityEvent): string | null {
  if (event.entityType === "message") {
    return `/projects/${event.projectId}/messages`;
  }

  if (event.entityType === "extraction_task" && event.entityId) {
    return `/projects/${event.projectId}/tasks`;
  }

  if (event.entityType === "file" && event.entityId) {
    return `/projects/${event.projectId}/files/${event.entityId}`;
  }

  return null;
}
