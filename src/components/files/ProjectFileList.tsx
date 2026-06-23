"use client";

import Link from "next/link";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileText, RefreshCw } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/components/notifications/time";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Database, ProjectFileRow } from "@/lib/supabase/database.types";
import { toProjectFile } from "@/lib/files/transform";
import type {
  FileProcessingStatus,
  ProjectFile,
  ProjectFileStatus,
} from "@/types/files";
import { FileStatusBadge } from "./FileStatusBadge";

interface ProjectFileListProps {
  projectId: string;
}

export function ProjectFileList({ projectId }: ProjectFileListProps) {
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [statusFilter, setStatusFilter] = useState<ProjectFileStatus | "all">(
    "all"
  );
  const [processingFilter, setProcessingFilter] = useState<
    FileProcessingStatus | "all"
  >("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createSupabaseBrowserClient();
    return supabaseRef.current;
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/files`, {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Project files are available to project members."
            : "Unable to load project files."
        );
      }

      const data = (await response.json()) as { files: ProjectFile[] };
      setFiles(data.files);
      setError(null);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load project files."
      );
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      await loadFiles();

      if (cancelled) {
        return;
      }

      try {
        const supabase = getSupabase();
        const channel = supabase
          .channel(`project-files:${projectId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "project_files",
              filter: `project_id=eq.${projectId}`,
            },
            (payload) => {
              if (payload.eventType === "DELETE") {
                setFiles((current) =>
                  current.filter((file) => file.id !== payload.old.id)
                );
                return;
              }

              const file = toProjectFile(payload.new as ProjectFileRow);
              setFiles((current) => mergeFile(file, current));
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
  }, [getSupabase, loadFiles, projectId]);

  const filteredFiles = useMemo(
    () =>
      files.filter(
        (file) =>
          (statusFilter === "all" || file.status === statusFilter) &&
          (processingFilter === "all" ||
            file.processingStatus === processingFilter)
      ),
    [files, processingFilter, statusFilter]
  );

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Project files</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Uploaded source files and processing state.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setLoading(true);
            void loadFiles();
          }}
        >
          <RefreshCw data-icon="inline-start" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.currentTarget.value as ProjectFileStatus | "all")
              }
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="uploaded">uploaded</option>
              <option value="processing">processing</option>
              <option value="ready">ready</option>
              <option value="failed">failed</option>
              <option value="deleted">deleted</option>
              <option value="archived">archived</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium">Processing</span>
            <select
              value={processingFilter}
              onChange={(event) =>
                setProcessingFilter(
                  event.currentTarget.value as FileProcessingStatus | "all"
                )
              }
              className="h-10 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All processing states</option>
              <option value="none">none</option>
              <option value="queued">queued</option>
              <option value="parsing">parsing</option>
              <option value="extracting">extracting</option>
              <option value="validating">validating</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
            </select>
          </label>
        </div>

        {loading ? (
          <FileListSkeleton />
        ) : error ? (
          <StateMessage title="Unable to load files" description={error} />
        ) : filteredFiles.length === 0 ? (
          <StateMessage
            title="No files"
            description="Uploaded project files and AI processing state will appear here."
          />
        ) : (
          <ScrollArea className="max-h-[36rem] pr-3">
            <div className="flex flex-col gap-2">
              {filteredFiles.map((file) => (
                <FileRow key={file.id} projectId={projectId} file={file} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function FileRow({
  projectId,
  file,
}: {
  projectId: string;
  file: ProjectFile;
}) {
  return (
    <Link
      href={`/projects/${projectId}/files/${file.id}` as Route}
      className="block rounded-md border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-background">
            <FileText className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{file.originalFileName}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {file.mimeType ?? "unknown type"} · {formatFileSize(file.fileSize)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              uploaded {formatRelativeTime(file.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          <FileStatusBadge status={file.status} />
          <FileStatusBadge processingStatus={file.processingStatus} />
        </div>
      </div>
    </Link>
  );
}

function mergeFile(file: ProjectFile, files: ProjectFile[]) {
  const next = files.some((item) => item.id === file.id)
    ? files.map((item) => (item.id === file.id ? file : item))
    : [file, ...files];

  return next.sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function FileListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
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
    <div className="rounded-md border border-dashed px-4 py-10 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
