"use client";

import { useMemo, useState } from "react";
import { Check, FileJson, Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ExtractionResultItem,
  ExtractionResultItemStatus,
} from "@/types/extraction-results";
import { ExtractionResultStatusBadge } from "./ExtractionResultStatusBadge";

interface ResultItemEditorProps {
  item: ExtractionResultItem | null;
  onItemUpdated: (item: ExtractionResultItem) => void;
}

export function ResultItemEditor({
  item,
  onItemUpdated,
}: ResultItemEditorProps) {
  if (!item) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Item editor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
            <FileJson className="size-9 text-muted-foreground" />
            <p className="text-sm font-medium">Select an item</p>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Choose a row to inspect original AI output and record a review action.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <ResultItemEditorForm
      key={item.id}
      item={item}
      onItemUpdated={onItemUpdated}
    />
  );
}

function ResultItemEditorForm({
  item,
  onItemUpdated,
}: {
  item: ExtractionResultItem;
  onItemUpdated: (item: ExtractionResultItem) => void;
}) {
  const [valueText, setValueText] = useState(() =>
    JSON.stringify(item.value, null, 2)
  );
  const [comment, setComment] = useState("");
  const [savingStatus, setSavingStatus] = useState<ExtractionResultItemStatus | null>(
    null
  );
  const parsed = useMemo(() => parseJson(valueText), [valueText]);

  async function save(status: ExtractionResultItemStatus) {
    if (!parsed.ok) {
      return;
    }

    setSavingStatus(status);

    try {
      const response = await fetch(`/api/results/items/${item.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: status === "corrected" ? parsed.value : item.value,
          status,
          comment,
        }),
      });
      const data = (await response.json()) as {
        item?: ExtractionResultItem;
        error?: string;
      };

      if (!response.ok || !data.item) {
        throw new Error(data.error || "Unable to update review item.");
      }

      onItemUpdated(data.item);
      toast.success(`Item marked ${status}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update review item."
      );
    } finally {
      setSavingStatus(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">
              {item.label ?? "Untitled item"}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{item.itemType}</p>
          </div>
          <ExtractionResultStatusBadge status={item.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm font-medium">Original value</p>
          <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
            <pre className="whitespace-pre-wrap text-xs leading-5">
              {JSON.stringify(item.originalValue ?? item.value, null, 2)}
            </pre>
          </ScrollArea>
        </div>

        <Separator />

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Reviewed value</span>
          <Textarea
            value={valueText}
            onChange={(event) => setValueText(event.currentTarget.value)}
            rows={10}
            className="font-mono text-xs"
          />
        </label>

        {!parsed.ok ? (
          <Alert variant="destructive">
            <AlertTitle>Invalid JSON</AlertTitle>
            <AlertDescription>{parsed.error}</AlertDescription>
          </Alert>
        ) : null}

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium">Review comment</span>
          <Textarea
            value={comment}
            onChange={(event) => setComment(event.currentTarget.value)}
            placeholder="Fixed unit from mg to mmol."
            rows={3}
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(savingStatus) || !parsed.ok}
            onClick={() => void save("accepted")}
          >
            {savingStatus === "accepted" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            Accept
          </Button>
          <Button
            type="button"
            disabled={Boolean(savingStatus) || !parsed.ok}
            onClick={() => void save("corrected")}
          >
            {savingStatus === "corrected" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Correct
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={Boolean(savingStatus) || !parsed.ok}
            onClick={() => void save("rejected")}
          >
            {savingStatus === "rejected" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <X data-icon="inline-start" />
            )}
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function parseJson(value: string): { ok: true; value: Json } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(value) as Json };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to parse JSON.",
    };
  }
}
