"use client";

import { useState } from "react";
import { Download, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRelativeTime } from "@/components/notifications/time";
import type {
  ExtractionExportType,
  ExtractionResult,
  ExtractionResultExport,
} from "@/types/extraction-results";

interface ResultExportPanelProps {
  result: ExtractionResult;
  exports: ExtractionResultExport[];
  onExportCreated: (exportRecord: ExtractionResultExport) => void;
}

export function ResultExportPanel({
  result,
  exports,
  onExportCreated,
}: ResultExportPanelProps) {
  const [loadingType, setLoadingType] = useState<ExtractionExportType | null>(null);

  async function createExport(exportType: ExtractionExportType) {
    setLoadingType(exportType);

    try {
      const response = await fetch(`/api/results/${result.id}/export`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exportType }),
      });
      const data = (await response.json()) as {
        export?: ExtractionResultExport;
        error?: string;
      };

      if (!response.ok || !data.export) {
        throw new Error(data.error || "Unable to create export.");
      }

      onExportCreated(data.export);
      downloadInlineExport(data.export);
      toast.success(`${exportType.toUpperCase()} export created.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create export.");
    } finally {
      setLoadingType(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Exports</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Create reviewed data outputs for downstream scientific workflows.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-3">
          {(["json", "csv", "xlsx"] as const).map((exportType) => (
            <Button
              key={exportType}
              type="button"
              variant="outline"
              disabled={Boolean(loadingType) || result.status === "rejected"}
              onClick={() => void createExport(exportType)}
            >
              {loadingType === exportType ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <FileDown data-icon="inline-start" />
              )}
              {exportType.toUpperCase()}
            </Button>
          ))}
        </div>

        {exports.length === 0 ? (
          <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            Export records will appear after reviewed data is generated.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((exportRecord) => (
                <TableRow key={exportRecord.id}>
                  <TableCell>{exportRecord.exportType.toUpperCase()}</TableCell>
                  <TableCell>{exportRecord.status}</TableCell>
                  <TableCell>{formatRelativeTime(exportRecord.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={!hasInlineContent(exportRecord)}
                      onClick={() => downloadInlineExport(exportRecord)}
                    >
                      <Download className="size-4" aria-hidden="true" />
                      <span className="sr-only">Download</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function hasInlineContent(exportRecord: ExtractionResultExport) {
  return typeof exportRecord.metadata.inlineContent === "string";
}

function downloadInlineExport(exportRecord: ExtractionResultExport) {
  const content = exportRecord.metadata.inlineContent;
  const fileName =
    typeof exportRecord.metadata.fileName === "string"
      ? exportRecord.metadata.fileName
      : `chemvault-result.${exportRecord.exportType}`;
  const contentType =
    typeof exportRecord.metadata.contentType === "string"
      ? exportRecord.metadata.contentType
      : "application/octet-stream";

  if (typeof content !== "string") {
    toast.error("This export does not have an inline download payload.");
    return;
  }

  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
