"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/components/notifications/time";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  Database,
  ExtractionResultItemRow,
  ExtractionResultRow,
} from "@/lib/supabase/database.types";
import {
  toExtractionResult,
  toExtractionResultItem,
} from "@/lib/results/transform";
import type {
  ExtractionResult,
  ExtractionResultExport,
  ExtractionResultItem,
  ExtractionResultReview,
} from "@/types/extraction-results";
import { ResultExportPanel } from "./ResultExportPanel";
import { ResultItemEditor } from "./ResultItemEditor";
import { ResultItemTable } from "./ResultItemTable";
import { ResultReviewPanel } from "./ResultReviewPanel";

interface ResultDetailResponse {
  result: ExtractionResult;
  items: ExtractionResultItem[];
  reviews: ExtractionResultReview[];
  exports: ExtractionResultExport[];
}

interface ResultReviewWorkspaceProps {
  projectId: string;
  resultId: string;
}

export function ResultReviewWorkspace({
  projectId,
  resultId,
}: ResultReviewWorkspaceProps) {
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [items, setItems] = useState<ExtractionResultItem[]>([]);
  const [reviews, setReviews] = useState<ExtractionResultReview[]>([]);
  const [exports, setExports] = useState<ExtractionResultExport[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createSupabaseBrowserClient();
    return supabaseRef.current;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/projects/${projectId}/results/${resultId}`,
        { credentials: "same-origin" }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "Extraction result not found."
            : "Unable to load extraction result."
        );
      }

      const data = (await response.json()) as ResultDetailResponse;
      setResult(data.result);
      setItems(data.items);
      setReviews(data.reviews);
      setExports(data.exports);
      setSelectedItemId((current) => current ?? data.items[0]?.id ?? null);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load extraction result."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId, resultId]);

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
          .channel(`result-review:${resultId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "extraction_results",
              filter: `id=eq.${resultId}`,
            },
            (payload) => {
              setResult(toExtractionResult(payload.new as ExtractionResultRow));
            }
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "extraction_result_items",
              filter: `result_id=eq.${resultId}`,
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                setItems((current) =>
                  current.filter((item) => item.id !== payload.old.id)
                );
                return;
              }

              const item = toExtractionResultItem(
                payload.new as ExtractionResultItemRow
              );
              setItems((current) => mergeItem(item, current));
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        if (!cancelled) {
          setError("Realtime review updates are unavailable.");
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
  }, [getSupabase, refresh, resultId]);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? items[0] ?? null,
    [items, selectedItemId]
  );

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <Skeleton className="h-[32rem] w-full" />
        <Skeleton className="h-[32rem] w-full" />
      </div>
    );
  }

  if (error || !result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load result</CardTitle>
          <p className="text-sm text-muted-foreground">
            {error ?? "Extraction result is unavailable."}
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex justify-end">
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
        </div>
        <ResultItemTable
          items={items}
          selectedItemId={selectedItem?.id ?? null}
          onSelectItem={(item) => setSelectedItemId(item.id)}
        />
        <ResultItemEditor
          item={selectedItem}
          onItemUpdated={(item) => {
            setItems((current) => mergeItem(item, current));
            setSelectedItemId(item.id);
            void refresh();
          }}
        />
        <ReviewHistory reviews={reviews} />
      </div>
      <aside className="flex flex-col gap-6">
        <ResultReviewPanel
          result={result}
          items={items}
          onResultChange={(nextResult) => {
            setResult(nextResult);
            void refresh();
          }}
        />
        <ResultExportPanel
          result={result}
          exports={exports}
          onExportCreated={(exportRecord) => {
            setExports((current) => [exportRecord, ...current]);
            void refresh();
          }}
        />
      </aside>
    </div>
  );
}

function mergeItem(
  item: ExtractionResultItem,
  items: ExtractionResultItem[]
): ExtractionResultItem[] {
  const next = items.some((current) => current.id === item.id)
    ? items.map((current) => (current.id === item.id ? item : current))
    : [...items, item];

  return next.sort(
    (left, right) =>
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  );
}

function ReviewHistory({ reviews }: { reviews: ExtractionResultReview[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" aria-hidden="true" />
          Review history
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Review actions will be recorded here.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviews.map((review) => (
                <TableRow key={review.id}>
                  <TableCell>{review.action}</TableCell>
                  <TableCell>{review.reviewerId}</TableCell>
                  <TableCell>{formatRelativeTime(review.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
