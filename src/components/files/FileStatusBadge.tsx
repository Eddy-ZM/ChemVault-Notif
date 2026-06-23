"use client";

import { Badge } from "@/components/ui/badge";
import type { FileProcessingStatus, ProjectFileStatus } from "@/types/files";

interface FileStatusBadgeProps {
  status?: ProjectFileStatus | null;
  processingStatus?: FileProcessingStatus | null;
}

export function FileStatusBadge({
  status,
  processingStatus,
}: FileStatusBadgeProps) {
  if (processingStatus) {
    return (
      <Badge variant={processingStatusVariant(processingStatus)}>
        {processingStatus}
      </Badge>
    );
  }

  return <Badge variant={statusVariant(status)}>{status ?? "unknown"}</Badge>;
}

function statusVariant(status: ProjectFileStatus | null | undefined) {
  if (status === "failed" || status === "deleted") {
    return "destructive" as const;
  }

  if (status === "ready") {
    return "default" as const;
  }

  return "secondary" as const;
}

function processingStatusVariant(
  processingStatus: FileProcessingStatus | null | undefined
) {
  if (processingStatus === "failed") {
    return "destructive" as const;
  }

  if (processingStatus === "completed") {
    return "default" as const;
  }

  return "secondary" as const;
}
