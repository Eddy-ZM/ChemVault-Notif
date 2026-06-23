"use client";

import { Badge } from "@/components/ui/badge";

interface ConfidenceBadgeProps {
  value: number | null | undefined;
}

export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  if (typeof value !== "number") {
    return <Badge variant="secondary">confidence n/a</Badge>;
  }

  const percent = Math.round(value * 100);
  const label =
    value >= 0.85
      ? "high confidence"
      : value >= 0.6
        ? "medium confidence"
        : "low confidence";

  return (
    <Badge variant={value < 0.6 ? "destructive" : value < 0.85 ? "secondary" : "default"}>
      {label} · {percent}%
    </Badge>
  );
}
