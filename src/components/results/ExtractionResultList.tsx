"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Beaker, RefreshCw } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ExtractionResultRow,
} from "@/lib/supabase/database.types";
import { toExtractionResult } from "@/lib/results/transform";
import type {
  ExtractionResult,
  ExtractionResultStatus,
} from "@/types/extraction-results";
import { ExtractionResultStatusBadge } from "./ExtractionResultStatusBadge";

interface ExtractionResultListProps {
  projectId: string;
}

export function ExtractionResultList({ projectId }: ExtractionResultListProps) {
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [results, setResults] = useState<ExtractionResult[]>([]);
  const [statusFilter, setStatusFilter] = useState<ExtractionResultStatus | "all">(
    "all"
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createSupabaseBrowserClient();
    return supabaseRef.current;
  }, []);

  const loadResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/results`, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Project results are available to project members."
            : "Unable to load extraction results."
        );
      }

      const data = (await response.json()) as { results: ExtractionResult[] };
      setResults(data.results);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load extraction results."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      await loadResults();

      if (cancelled) {
        return;
      }

      try {
        const supabase = getSupabase();
        const channel = supabase
          .channel(`project-results:${projectId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "extraction_results",
              filter: `project_id=eq.${projectId}`,
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                setResults((current) =>
                  current.filter((result) => result.id !== payload.old.id)
                );
                return;
              }

              const result = toExtractionResult(
                payload.new as ExtractionResultRow
              );
              setResults((current) => mergeResult(result, current));
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        if (!cancelled) {
          setError("Realtime result updates are unavailable.");
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
  }, [getSupabase, loadResults, projectId]);

  const filteredResults = useMemo(
    () =>
      results.filter(
        (result) => statusFilter === "all" || result.status === statusFilter
      ),
    [results, statusFilter]
  );

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Extraction results</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            AI outputs awaiting human review, approval, and export.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            void loadResults();
          }}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <label className="flex max-w-xs flex-col gap-2 text-sm">
          <span className="font-medium">Status</span>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.currentTarget.value as ExtractionResultStatus | "all")
            }
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="ready_for_review">ready_for_review</option>
            <option value="in_review">in_review</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="exported">exported</option>
            <option value="archived">archived</option>
          </select>
        </label>

        {loading ? (
          <ResultListSkeleton />
        ) : error ? (
          <StateMessage title="Unable to load results" description={error} />
        ) : filteredResults.length === 0 ? (
          <StateMessage
            title="No extraction results"
            description="Completed AI extractions with structured output will appear here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Result</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Confidence</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResults.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    <Link
                      href={`/projects/${projectId}/results/${result.id}` as Route}
                      className="font-medium hover:underline"
                    >
                      {resultTitle(result)}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      task {result.taskId}
                    </p>
                  </TableCell>
                  <TableCell>
                    <ExtractionResultStatusBadge status={result.status} />
                  </TableCell>
                  <TableCell>{formatConfidence(result.confidenceScore)}</TableCell>
                  <TableCell>{result.modelName ?? "not recorded"}</TableCell>
                  <TableCell>{formatRelativeTime(result.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function mergeResult(
  result: ExtractionResult,
  results: ExtractionResult[]
): ExtractionResult[] {
  const next = results.some((item) => item.id === result.id)
    ? results.map((item) => (item.id === result.id ? result : item))
    : [result, ...results];

  return next.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function resultTitle(result: ExtractionResult): string {
  const originalFileName = result.metadata.originalFileName;
  if (typeof originalFileName === "string" && originalFileName.trim()) {
    return originalFileName.trim();
  }

  return result.fileId ? `Result for file ${result.fileId}` : `Result ${result.id}`;
}

function formatConfidence(value: number | null): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "n/a";
}

function ResultListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
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
      <Beaker className="size-9 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
