"use client";

import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ApprovedDataset } from "@/types/results";

interface ApprovedDatasetViewProps {
  dataset: ApprovedDataset | null;
}

export function ApprovedDatasetView({ dataset }: ApprovedDatasetViewProps) {
  if (!dataset) {
    return null;
  }

  const json = JSON.stringify(dataset.data, null, 2);

  async function copyJson() {
    await navigator.clipboard.writeText(json);
    toast.success("Dataset JSON copied.");
  }

  function downloadJson() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${dataset?.title || "chemvault-dataset"}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-base">Approved dataset</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {dataset.title}
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void copyJson()}>
            <Copy data-icon="inline-start" />
            Copy
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={downloadJson}>
            <Download data-icon="inline-start" />
            JSON
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96 rounded-md border bg-muted/30 p-4">
          <pre className="whitespace-pre-wrap text-xs leading-5">{json}</pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
