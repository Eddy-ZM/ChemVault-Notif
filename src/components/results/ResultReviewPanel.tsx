"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Loader2,
  PlayCircle,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
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
  ApprovedDataset,
  ExtractionResult,
  ExtractionResultItem,
} from "@/types/extraction-results";
import { ExtractionResultStatusBadge } from "./ExtractionResultStatusBadge";

interface ResultReviewPanelProps {
  projectId: string;
  result: ExtractionResult;
  items: ExtractionResultItem[];
  onResultChange: (
    result: ExtractionResult,
    dataset?: ApprovedDataset | null
  ) => void;
}

export function ResultReviewPanel({
  projectId,
  result,
  items,
  onResultChange,
}: ResultReviewPanelProps) {
  const [startingReview, setStartingReview] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rerunning, setRerunning] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rerunOpen, setRerunOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [rerunNote, setRerunNote] = useState("");

  const stats = useMemo(() => reviewStats(items), [items]);
  const canApprove =
    items.length > 0 && stats.pending === 0 && stats.uncertain === 0;

  async function startReview() {
    setStartingReview(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/results/${result.id}/start-review`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );
      const data = (await response.json()) as {
        result?: ExtractionResult;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Unable to start review.");
      }

      onResultChange(data.result);
      toast.success("Review started.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start review.");
    } finally {
      setStartingReview(false);
    }
  }

  async function approve() {
    setApproving(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/results/${result.id}/approve`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: "Human review approved." }),
        }
      );
      const data = (await response.json()) as {
        result?: ExtractionResult;
        dataset?: ApprovedDataset;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Unable to approve result.");
      }

      onResultChange(data.result, data.dataset ?? null);
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
      const response = await fetch(
        `/api/projects/${projectId}/results/${result.id}/reject`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: reason }),
        }
      );
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

  async function requestRerun() {
    setRerunning(true);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/results/${result.id}/rerun`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: rerunNote }),
        }
      );
      const data = (await response.json()) as {
        result?: ExtractionResult;
        error?: string;
      };

      if (!response.ok || !data.result) {
        throw new Error(data.error || "Unable to request rerun.");
      }

      onResultChange(data.result);
      setRerunOpen(false);
      setRerunNote("");
      toast.success("Rerun requested.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to request rerun.");
    } finally {
      setRerunning(false);
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
            <Metric label="Uncertain" value={String(stats.uncertain)} />
          </div>

          <Separator />

          {!canApprove ? (
            <Alert>
              <ShieldCheck className="size-4" aria-hidden="true" />
              <AlertTitle>Review required</AlertTitle>
              <AlertDescription>
                Accept, correct, or reject every item before approving the
                result. Uncertain items need a final decision.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              <AlertTitle>Ready to approve</AlertTitle>
              <AlertDescription>
                All review items have an explicit human decision.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={startingReview || result.status === "in_review"}
              onClick={() => void startReview()}
            >
              {startingReview ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <PlayCircle data-icon="inline-start" />
              )}
              Start review
            </Button>
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
            <Button
              type="button"
              variant="outline"
              disabled={rerunning || result.status === "rerun_requested"}
              onClick={() => setRerunOpen(true)}
            >
              <RotateCcw data-icon="inline-start" />
              Request rerun
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

      <Dialog open={rerunOpen} onOpenChange={setRerunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request extraction rerun</DialogTitle>
            <DialogDescription>
              Add a note for the worker or scientist who will rerun this extraction.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={rerunNote}
            onChange={(event) => setRerunNote(event.currentTarget.value)}
            placeholder="Rerun with stricter table validation."
            rows={4}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRerunOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={rerunning}
              onClick={() => void requestRerun()}
            >
              {rerunning ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <RotateCcw data-icon="inline-start" />
              )}
              Request rerun
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
    { accepted: 0, corrected: 0, pending: 0, rejected: 0, uncertain: 0 }
  );
}

function formatConfidence(value: number | null): string {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "n/a";
}
