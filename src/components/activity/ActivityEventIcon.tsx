"use client";

import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CircleDot,
  FileText,
  FlaskConical,
  MessageSquare,
  RadioTower,
  Shield,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectActivityEvent } from "@/types/audit";

interface ActivityEventIconProps {
  event: ProjectActivityEvent;
}

export function ActivityEventIcon({ event }: ActivityEventIconProps) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-md border bg-background",
        event.severity === "success" && "border-primary/30 text-primary",
        event.severity === "warning" && "border-amber-300 text-amber-700",
        event.severity === "error" && "border-destructive/30 text-destructive",
        event.severity === "critical" && "border-destructive text-destructive"
      )}
      aria-hidden="true"
    >
      <IconGlyph event={event} />
    </span>
  );
}

function IconGlyph({ event }: ActivityEventIconProps) {
  if (event.severity === "success") {
    return <CheckCircle2 className="size-4" />;
  }

  if (event.severity === "error" || event.severity === "critical") {
    return <XCircle className="size-4" />;
  }

  if (event.severity === "warning") {
    return <AlertTriangle className="size-4" />;
  }

  if (event.eventType.startsWith("file.")) {
    return <FileText className="size-4" />;
  }

  if (event.eventType.startsWith("extraction.")) {
    return <FlaskConical className="size-4" />;
  }

  if (event.eventType.startsWith("message.")) {
    return <MessageSquare className="size-4" />;
  }

  if (event.eventType.startsWith("notification.")) {
    return <Bell className="size-4" />;
  }

  if (event.eventType.startsWith("webhook.")) {
    return <RadioTower className="size-4" />;
  }

  if (event.eventType.startsWith("security.")) {
    return <Shield className="size-4" />;
  }

  return <CircleDot className="size-4" />;
}
