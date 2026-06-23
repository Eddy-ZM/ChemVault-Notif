"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import type {
  ExtractionResult,
  ExtractionResultItem,
} from "@/types/extraction-results";
import { ExtractionResultStatusBadge } from "./ExtractionResultStatusBadge";

interface ResultReviewPanelProps {
  result: ExtractionResult;
  items: ExtractionResultItem[];
  onResultChange: (result: ExtractionResult) => void;
}

export function ResultReviewPanel({
  result,
  items,
  onResultChange,
}: ResultReviewPanelProps) {
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const stats = useMemo(() => reviewStats(items), [items]);
  const canApprove = items.length > 0 && stats.pending === 0 && stats.rejected === 0;

  async function approve() {
    setApproving(true);

    try {
      const response = await fetch(`/api/results/${result.id}/approve`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: "Human review approved." }),
      });
      const data = (await response.json()) as {
        result?: ExtractionResult;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Unable to approve result.");
      }

      onResultChange(data.result);
      toast.success("Extraction result approved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to approve result."
      );
    } finally {
      setApproving(false);
    }
  }

  async function reject() {
    setRejecting(true);

    try {
      const response = await fetch(`/api/results/${result.id}/reject`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = (await response.json()) as {
        result?: ExtractionResult;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Unable to reject result.");
      }

      onResultChange(data.result);
      setRejectOpen(false);
      setReason("");
      toast.success("Extraction result rejected.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to reject result."
      );
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Review state</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Human validation gate for extracted scientific data.
              </p>
            </div>
            <ExtractionResultStatusBadge status={result.status} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Metric label="Confidence" value={formatConfidence(result.confidenceScore)} />
            <Metric label="Items" value={String(items.length)} />
            <Metric label="Accepted" value={String(stats.accepted)} />
            <Metric label="Corrected" value={String(stats.corrected)} />
            <Metric label="Pending" value={String(stats.pending)} />
            <Metric label="Rejected" value={String(stats.rejected)} />
          </div>

          <Separator />

          {!canApprove ? (
            <Alert>
              <ShieldCheck className="size-4" aria-hidden="true" />
              <AlertTitle>Review required</AlertTitle>
              <AlertDescription>
                Accept or correct every item before approving the result.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <AlertTitle>Ready to approve</AlertTitle>
              <AlertDescription>
                All review items are accepted or corrected.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              disabled={!canApprove || approving || result.status === "approved"}
              onClick={() => void approve()}
            >
              {approving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 data-icon="inline-start" />
              )}
              Approve result
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={rejecting || result.status === "rejected"}
              onClick={() => setRejectOpen(true)}
            >
              <XCircle data-icon="inline-start" />
              Reject result
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject extraction result</DialogTitle>
            <DialogDescription>
              Provide a concise reason so the extraction can be reviewed or rerun.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.currentTarget.value)}
            placeholder="Incorrect table extraction on page 4."
            rows={4}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!reason.trim() || rejecting}
              onClick={() => void reject()}
            >
              {rejecting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle data-icon="inline-start" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function reviewStats(items: ExtractionResultItem[]) {
  return items.reduce(
    (stats, item) => {
      stats[item.status] += 1;
      return stats;
    },
    { accepted: 0, corrected: 0, pending: 0, rejected: 0 }
  );
}

function formatConfidence(value: number | null): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "n/a";
}
