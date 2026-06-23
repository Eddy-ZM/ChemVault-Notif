"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Play, Trash2 } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database, ProjectFileRow } from "@/lib/supabase/database.types";
import { toProjectFile } from "@/lib/files/transform";
import type { FileEvent, ProjectFile } from "@/types/files";
import type { ExtractionResult } from "@/types/results";
import { FileProcessingTimeline } from "./FileProcessingTimeline";
import { FileStatusBadge } from "./FileStatusBadge";

interface FileDetailPanelProps {
  projectId: string;
  fileId: string;
}

export function FileDetailPanel({ projectId, fileId }: FileDetailPanelProps) {
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [file, setFile] = useState<ProjectFile | null>(null);
  const [events, setEvents] = useState<FileEvent[]>([]);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 404
            ? "File not found."
            : "Unable to load file details."
        );
      }

      const data = (await response.json()) as {
        file: ProjectFile;
        events: FileEvent[];
        result: ExtractionResult | null;
      };
      setFile(data.file);
      setEvents(data.events);
      setResult(data.result);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load file details."
      );
    } finally {
      setLoading(false);
    }
  }, [fileId, projectId]);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      await loadFile();

      if (cancelled) {
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        supabaseRef.current = supabase;
        const channel = supabase
          .channel(`project-file:${fileId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "project_files",
              filter: `id=eq.${fileId}`,
            },
            (payload) => {
              setFile(toProjectFile(payload.new as ProjectFileRow));
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        if (!cancelled) {
          setError("Realtime file updates are unavailable.");
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
  }, [fileId, loadFile]);

  async function startProcessing() {
    setActionLoading("process");

    try {
      const response = await fetch(
        `/api/projects/${projectId}/files/${fileId}/process`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to start file processing.");
      }

      toast.success("File processing queued.");
      await loadFile();
    } catch (processError) {
      const message =
        processError instanceof Error
          ? processError.message
          : "Unable to start file processing.";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  }

  async function deleteFile() {
    setActionLoading("delete");

    try {
      const response = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      const data = (await response.json()) as {
        file?: ProjectFile;
        error?: string;
      };

      if (!response.ok || !data.file) {
        throw new Error(data.error || "Unable to delete file.");
      }

      setFile(data.file);
      toast.success("File marked as deleted.");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete file.";
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error && !file) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Unable to load file</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!file) {
    return null;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileText className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="truncate text-xl">
                {file.originalFileName}
              </CardTitle>
              <CardDescription>{file.storagePath}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <FileStatusBadge status={file.status} />
            <FileStatusBadge processingStatus={file.processingStatus} />
          </div>

          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <Meta label="MIME type" value={file.mimeType} />
            <Meta label="Size" value={formatFileSize(file.fileSize)} />
            <Meta label="Storage bucket" value={file.storageBucket} />
            <Meta label="File hash" value={file.fileHash} />
            <Meta label="Uploaded" value={formatDate(file.createdAt)} />
            <Meta label="Updated" value={formatDate(file.updatedAt)} />
          </div>

          {file.extractionTaskId ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link
                  href={`/projects/${projectId}/tasks/${file.extractionTaskId}` as Route}
                >
                  Related extraction task
                </Link>
              </Button>
              {result ? (
                <Button variant="outline" asChild>
                  <Link
                    href={`/projects/${projectId}/results/${result.id}` as Route}
                  >
                    Review extraction result
                  </Link>
                </Button>
              ) : null}
            </div>
          ) : null}

          <Separator />

          <div>
            <p className="text-sm font-medium">Processing timeline</p>
            <div className="mt-3">
              <FileProcessingTimeline
                projectId={projectId}
                fileId={fileId}
                initialEvents={events}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Actions</CardTitle>
            <CardDescription>
              Queue supported files for AI extraction or remove them from the project.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              type="button"
              disabled={actionLoading !== null || file.status === "deleted"}
              onClick={() => void startProcessing()}
            >
              {actionLoading === "process" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play data-icon="inline-start" />
              )}
              Start processing
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={actionLoading !== null || file.status === "deleted"}
              onClick={() => void deleteFile()}
            >
              {actionLoading === "delete" ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Trash2 data-icon="inline-start" />
              )}
              Delete file
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[24rem] overflow-auto rounded-md bg-muted p-4 text-xs leading-5 text-muted-foreground">
              {JSON.stringify(file.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm">{value ?? "none"}</p>
    </div>
  );
}

function formatFileSize(size: number | null) {
  if (!size) {
    return "size unknown";
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
