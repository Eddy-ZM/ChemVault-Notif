import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ListChecks,
  Megaphone,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/lib/notifications/types";

const iconConfig = {
  info: {
    icon: Info,
    className: "bg-sky-50 text-sky-700 ring-sky-100",
  },
  success: {
    icon: CheckCircle2,
    className: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-700 ring-amber-100",
  },
  error: {
    icon: XCircle,
    className: "bg-rose-50 text-rose-700 ring-rose-100",
  },
  message: {
    icon: MessageSquare,
    className: "bg-violet-50 text-violet-700 ring-violet-100",
  },
  system: {
    icon: Megaphone,
    className: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  },
  task: {
    icon: ListChecks,
    className: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  },
} satisfies Record<NotificationType, { icon: typeof Info; className: string }>;

interface NotificationIconProps {
  type: NotificationType;
  className?: string;
}

export function NotificationIcon({ type, className }: NotificationIconProps) {
  const config = iconConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md ring-1",
        config.className,
        className
      )}
    >
      <Icon className="size-4" aria-hidden="true" />
    </span>
  );
}
