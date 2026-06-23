"use client";

import { useRef, useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ProjectFile } from "@/types/files";

interface FileUploadPanelProps {
  projectId: string;
  onUploaded?: (file: ProjectFile) => void;
}

const supportedMimeTypes = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export function FileUploadPanel({ projectId, onUploaded }: FileUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [autoProcess, setAutoProcess] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function uploadSelectedFile() {
    if (!selectedFile) {
      setError("Select a file before uploading.");
      return;
    }

    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const bucket =
        process.env.NEXT_PUBLIC_CHEMVAULT_FILES_BUCKET ?? "project-files";
      const storagePath = `${projectId}/${Date.now()}-${crypto.randomUUID()}-${safeFileName(
        selectedFile.name
      )}`;
      const supabase = createSupabaseBrowserClient();

      setProgress(35);
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type || undefined,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      setProgress(75);
      const response = await fetch(`/api/projects/${projectId}/files/register`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storageBucket: bucket,
          storagePath,
          originalFileName: selectedFile.name,
          fileName: safeFileName(selectedFile.name),
          mimeType: selectedFile.type || null,
          fileSize: selectedFile.size,
          autoProcess,
          metadata: {
            lastModified: selectedFile.lastModified,
          },
        }),
      });
      const data = (await response.json()) as {
        file?: ProjectFile;
        error?: string;
      };

      if (!response.ok || !data.file) {
        throw new Error(data.error || "Unable to register uploaded file.");
      }

      setProgress(100);
      setSelectedFile(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      onUploaded?.(data.file);
      toast.success("File uploaded.");
    } catch (uploadError) {
      const message =
        uploadError instanceof Error ? uploadError.message : "File upload failed.";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
      window.setTimeout(() => setProgress(0), 800);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <UploadCloud className="size-5" aria-hidden="true" />
          </span>
          <div>
            <CardTitle className="text-base">Upload file</CardTitle>
            <CardDescription>
              Add scientific source files to the project workspace.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input
          ref={inputRef}
          type="file"
          disabled={uploading}
          onChange={(event) =>
            setSelectedFile(event.currentTarget.files?.[0] ?? null)
          }
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={autoProcess}
            disabled={uploading}
            onChange={(event) => setAutoProcess(event.currentTarget.checked)}
          />
          <span>Start AI extraction automatically</span>
        </label>
        <p className="text-xs leading-5 text-muted-foreground">
          Supported for AI extraction: PDF, TXT, CSV, XLS, XLSX.
        </p>
        {progress > 0 ? (
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
        {selectedFile ? (
          <p className="text-sm text-muted-foreground">
            {selectedFile.name} · {selectedFile.type || "unknown type"}
          </p>
        ) : null}
        {selectedFile && autoProcess && !isSupportedMimeType(selectedFile.type) ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            This file type is not supported for automatic AI extraction.
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          disabled={
            uploading ||
            !selectedFile ||
            (autoProcess && selectedFile ? !isSupportedMimeType(selectedFile.type) : false)
          }
          onClick={() => void uploadSelectedFile()}
        >
          {uploading ? <Loader2 className="animate-spin" /> : null}
          Upload
        </Button>
      </CardContent>
    </Card>
  );
}

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function isSupportedMimeType(mimeType: string) {
  return supportedMimeTypes.includes(mimeType);
}
