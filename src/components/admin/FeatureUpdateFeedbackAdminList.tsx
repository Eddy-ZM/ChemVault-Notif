"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  FeatureUpdateFeedback,
  FeatureUpdateFeedbackStatus,
} from "@/types/feature-updates";

const statuses: FeatureUpdateFeedbackStatus[] = [
  "open",
  "reviewed",
  "resolved",
  "archived",
];

export function FeatureUpdateFeedbackAdminList({
  feedback,
}: {
  feedback: FeatureUpdateFeedback[];
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);

  async function updateStatus(id: string, status: FeatureUpdateFeedbackStatus) {
    setSavingId(id);

    try {
      await fetch(`/api/admin/feature-update-feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  if (feedback.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No feature update feedback yet.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Feedback</TableHead>
          <TableHead>Rating</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-48">Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {feedback.map((item) => (
          <TableRow key={item.id}>
            <TableCell>
              <p className="max-w-xl text-sm leading-6">{item.feedback}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Update {item.featureUpdateId}
              </p>
            </TableCell>
            <TableCell>{item.rating ?? "n/a"}</TableCell>
            <TableCell>
              <Badge variant="outline">{item.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(item.createdAt))}
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-2">
                {statuses
                  .filter((status) => status !== item.status)
                  .slice(0, 2)
                  .map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={savingId === item.id}
                      onClick={() => updateStatus(item.id, status)}
                    >
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      {status}
                    </Button>
                  ))}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
