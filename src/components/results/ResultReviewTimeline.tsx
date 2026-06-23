"use client";

import { History, PencilLine } from "lucide-react";
import { formatRelativeTime } from "@/components/notifications/time";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ResultCorrection, ResultReview } from "@/types/results";

interface ResultReviewTimelineProps {
  reviews: ResultReview[];
  corrections: ResultCorrection[];
}

type TimelineEntry = {
  id: string;
  type: "review" | "correction";
  title: string;
  description: string;
  createdAt: string;
};

export function ResultReviewTimeline({
  reviews,
  corrections,
}: ResultReviewTimelineProps) {
  const entries = [...reviewEntries(reviews), ...correctionEntries(corrections)]
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" aria-hidden="true" />
          Review timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Review actions and corrections will be recorded here.
          </div>
        ) : (
          <ScrollArea className="max-h-80">
            <ol className="space-y-4">
              {entries.map((entry) => (
                <li key={`${entry.type}-${entry.id}`} className="flex gap-3">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border bg-muted">
                    <PencilLine className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{entry.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {entry.description}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatRelativeTime(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function reviewEntries(reviews: ResultReview[]): TimelineEntry[] {
  return reviews.map((review) => ({
    id: review.id,
    type: "review",
    title: actionTitle(review.action),
    description:
      review.note?.trim() ||
      `Reviewer ${review.reviewerId} recorded ${review.action}.`,
    createdAt: review.createdAt,
  }));
}

function correctionEntries(corrections: ResultCorrection[]): TimelineEntry[] {
  return corrections.map((correction) => ({
    id: correction.id,
    type: "correction",
    title: "Correction recorded",
    description:
      correction.reason?.trim() ||
      `Field ${correction.fieldPath} was corrected by ${correction.correctedBy}.`,
    createdAt: correction.createdAt,
  }));
}

function actionTitle(action: ResultReview["action"]): string {
  switch (action) {
    case "started_review":
      return "Review started";
    case "item_accepted":
      return "Item accepted";
    case "item_corrected":
      return "Item corrected";
    case "item_rejected":
      return "Item rejected";
    case "approved":
      return "Result approved";
    case "rejected":
      return "Result rejected";
    case "rerun_requested":
      return "Rerun requested";
    default:
      return "Comment added";
  }
}
