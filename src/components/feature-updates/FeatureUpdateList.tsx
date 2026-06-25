import type { FeatureUpdate } from "@/types/feature-updates";
import { FeatureUpdateCard } from "./FeatureUpdateCard";

export function FeatureUpdateList({
  updates,
}: {
  updates: FeatureUpdate[];
}) {
  if (updates.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <p className="text-sm font-medium">No updates found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Published ChemVault product updates will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {updates.map((update) => (
        <FeatureUpdateCard key={update.id} update={update} />
      ))}
    </div>
  );
}
