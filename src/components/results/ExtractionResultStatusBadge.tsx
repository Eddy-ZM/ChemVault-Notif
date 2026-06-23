"use client";

import { Badge } from "@/components/ui/badge";
import type {
  ExtractionResultItemStatus,
  ExtractionResultStatus,
} from "@/types/extraction-results";

interface ExtractionResultStatusBadgeProps {
  status?: ExtractionResultStatus | ExtractionResultItemStatus | null;
}

export function ExtractionResultStatusBadge({
  status,
}: ExtractionResultStatusBadgeProps) {
  return <Badge variant={variantForStatus(status)}>{status ?? "unknown"}</Badge>;
}

function variantForStatus(
  status: ExtractionResultStatus | ExtractionResultItemStatus | null | undefined
) {
  if (status === "rejected" || status === "archived") {
    return "destructive" as const;
  }

  if (
    status === "approved" ||
    status === "exported" ||
    status === "accepted" ||
    status === "corrected"
  ) {
    return "default" as const;
  }

  return "secondary" as const;
}
