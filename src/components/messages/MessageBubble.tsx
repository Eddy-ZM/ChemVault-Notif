import {
  Activity,
  Bot,
  ClipboardCheck,
  ShieldCheck,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Message, MessageSenderType } from "@/types/messages";

interface MessageBubbleProps {
  message: Message;
  isOwn?: boolean;
}

export function MessageBubble({ message, isOwn = false }: MessageBubbleProps) {
  if (message.senderType === "system" || message.senderType === "task") {
    const Icon = message.senderType === "task" ? ClipboardCheck : Activity;

    return (
      <div className="flex gap-3 rounded-md border border-dashed bg-muted/35 px-3 py-3">
        <span className={cn("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md", workflowIconClass(message.senderType))}>
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{senderLabel(message.senderType)}</Badge>
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(message.createdAt)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-foreground">{message.body}</p>
        </div>
      </div>
    );
  }

  const Icon = message.senderType === "ai" ? Bot : message.senderType === "admin" ? ShieldCheck : User;

  return (
    <div
      className={cn(
        "flex gap-3",
        isOwn && message.senderType === "user" ? "justify-end" : "justify-start"
      )}
    >
      {isOwn && message.senderType === "user" ? null : (
        <Avatar className="size-8">
          <AvatarFallback className={avatarClass(message.senderType)}>
            <Icon className="size-4" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[min(38rem,82%)] rounded-md border px-3 py-2 shadow-sm",
          bubbleClass(message.senderType, isOwn)
        )}
      >
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium">{senderLabel(message.senderType)}</span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(message.createdAt)}
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm leading-6">{message.body}</p>
      </div>
    </div>
  );
}

function senderLabel(senderType: MessageSenderType): string {
  switch (senderType) {
    case "admin":
      return "Admin";
    case "system":
      return "System";
    case "ai":
      return "AI agent";
    case "task":
      return "Workflow";
    case "user":
    default:
      return "Researcher";
  }
}

function bubbleClass(senderType: MessageSenderType, isOwn: boolean) {
  if (senderType === "user" && isOwn) {
    return "border-primary/20 bg-primary text-primary-foreground";
  }

  switch (senderType) {
    case "admin":
      return "border-amber-200 bg-amber-50 text-amber-950";
    case "ai":
      return "border-cyan-200 bg-cyan-50 text-cyan-950";
    default:
      return "bg-card text-card-foreground";
  }
}

function avatarClass(senderType: MessageSenderType) {
  switch (senderType) {
    case "admin":
      return "bg-amber-100 text-amber-800";
    case "ai":
      return "bg-cyan-100 text-cyan-800";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

function workflowIconClass(senderType: MessageSenderType) {
  return senderType === "task"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-secondary text-secondary-foreground";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
