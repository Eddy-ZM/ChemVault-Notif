import { AlertCircle, CheckCircle2, Clock3, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type {
  ChemVaultExtractionTask,
  ExtractionTaskStatus,
} from "@/lib/tasks/types";
import { formatRelativeTime } from "@/components/notifications/time";

const statusLabels = {
  uploaded: "Uploaded",
  queued: "Queued",
  processing: "Processing",
  extracting: "Extracting",
  validating: "Validating",
  completed: "Completed",
  failed: "Failed",
} satisfies Record<ExtractionTaskStatus, string>;

const statusBadgeClassName = {
  uploaded: "bg-secondary text-secondary-foreground",
  queued: "bg-secondary text-secondary-foreground",
  processing: "bg-accent text-accent-foreground",
  extracting: "bg-accent text-accent-foreground",
  validating: "bg-accent text-accent-foreground",
  completed: "bg-primary text-primary-foreground",
  failed: "bg-destructive text-destructive-foreground",
} satisfies Record<ExtractionTaskStatus, string>;

interface ExtractionTaskStatusProps {
  task: ChemVaultExtractionTask;
  detailHref?: string;
}

export function ExtractionTaskStatus({
  task,
  detailHref,
}: ExtractionTaskStatusProps) {
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              {isCompleted ? (
                <CheckCircle2 className="size-5" aria-hidden="true" />
              ) : isFailed ? (
                <AlertCircle className="size-5" aria-hidden="true" />
              ) : (
                <FileText className="size-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {task.fileName ?? "Untitled extraction task"}
              </CardTitle>
              <CardDescription>
                Updated {formatRelativeTime(task.updatedAt)} ago
              </CardDescription>
            </div>
          </div>
          <Badge className={cn("w-fit", statusBadgeClassName[task.status])}>
            {statusLabels[task.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Current stage</span>
            <span className="text-muted-foreground">{statusLabels[task.status]}</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-secondary"
            aria-label={`Task progress ${task.progress}%`}
            role="progressbar"
            aria-valuenow={task.progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={cn(
                "h-full rounded-full bg-primary transition-all",
                isFailed && "bg-destructive"
              )}
              style={{ width: `${task.progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>{task.progress}% complete</span>
            <span className="inline-flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden="true" />
              {new Intl.DateTimeFormat("en", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(task.updatedAt))}
            </span>
          </div>
        </div>

        {task.errorMessage ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {task.errorMessage}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {detailHref ? (
            <Button variant="outline" size="sm" asChild>
              <a href={detailHref}>View task details</a>
            </Button>
          ) : null}
          {isCompleted && task.projectId ? (
            <Button size="sm" asChild>
              <a href={`/projects/${task.projectId}/results`}>
                Open results
              </a>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
