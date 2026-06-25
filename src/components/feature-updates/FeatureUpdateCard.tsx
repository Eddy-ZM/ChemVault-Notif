import Link from "next/link";
import type { Route } from "next";
import { ArrowRight, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatRelativeTime } from "@/components/notifications/time";
import type { FeatureUpdate } from "@/types/feature-updates";
import { FeatureUpdateBadge } from "./FeatureUpdateBadge";

export function FeatureUpdateCard({ update }: { update: FeatureUpdate }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureUpdateBadge value={update.category} />
          {update.version ? (
            <span className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {update.version}
            </span>
          ) : null}
          {!update.readAt ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Circle className="size-2 fill-current" aria-hidden="true" />
              Unread
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {formatDate(update.publishedAt ?? update.createdAt)}
          </span>
        </div>
        <div className="grid gap-2">
          <CardTitle className="text-lg tracking-normal">
            {update.title}
          </CardTitle>
          <CardDescription className="leading-6">{update.summary}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline" size="sm">
          <Link href={`/updates/${update.slug}` as Route}>
            View update
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "";
  }

  const relative = formatRelativeTime(value);
  return relative || new Intl.DateTimeFormat("en").format(new Date(value));
}
