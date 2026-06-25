import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  FeatureUpdateCategory,
  FeatureUpdateStatus,
  FeatureUpdateVisibility,
} from "@/types/feature-updates";

const categoryLabels: Record<FeatureUpdateCategory, string> = {
  new_feature: "New feature",
  improvement: "Improvement",
  bug_fix: "Bug fix",
  security: "Security",
  maintenance: "Maintenance",
  breaking_change: "Breaking change",
  experimental: "Experimental",
  deprecation: "Deprecation",
  announcement: "Announcement",
};

const statusLabels: Record<FeatureUpdateStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};

const visibilityLabels: Record<FeatureUpdateVisibility, string> = {
  public: "Public",
  authenticated: "Authenticated",
  admin_only: "Admin only",
  targeted: "Targeted",
};

export function FeatureUpdateBadge({
  value,
  kind = "category",
}: {
  value: FeatureUpdateCategory | FeatureUpdateStatus | FeatureUpdateVisibility;
  kind?: "category" | "status" | "visibility";
}) {
  const label =
    kind === "status"
      ? statusLabels[value as FeatureUpdateStatus]
      : kind === "visibility"
        ? visibilityLabels[value as FeatureUpdateVisibility]
        : categoryLabels[value as FeatureUpdateCategory];

  return (
    <Badge
      variant="outline"
      className={cn(
        "w-fit rounded-md border px-2 py-0.5 font-medium",
        badgeClass(value)
      )}
    >
      {label ?? value}
    </Badge>
  );
}

function badgeClass(value: string) {
  switch (value) {
    case "security":
    case "breaking_change":
    case "archived":
      return "border-red-200 bg-red-50 text-red-800";
    case "bug_fix":
    case "maintenance":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "published":
    case "new_feature":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "experimental":
    case "targeted":
      return "border-indigo-200 bg-indigo-50 text-indigo-800";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function featureUpdateCategoryLabel(category: FeatureUpdateCategory) {
  return categoryLabels[category];
}
