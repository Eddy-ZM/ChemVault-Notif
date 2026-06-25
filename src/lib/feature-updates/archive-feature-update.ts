import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { NotificationError } from "@/lib/notifications/errors";
import type { FeatureUpdate } from "@/types/feature-updates";
import {
  createSupabaseFeatureUpdateStore,
  type FeatureUpdateStore,
} from "./feature-update-store";

export async function archiveFeatureUpdate(
  input: { updateId: string; actorId?: string | null },
  dependencies: { store?: FeatureUpdateStore } = {}
): Promise<FeatureUpdate> {
  const store = dependencies.store ?? createSupabaseFeatureUpdateStore();
  const update = await store.archiveUpdate(input.updateId, input.actorId ?? null);

  if (!update) {
    throw new NotificationError("Feature update not found.", undefined, 404);
  }

  await logAuditEvent({
    actorUserId: input.actorId ?? undefined,
    actorType: input.actorId ? "admin" : "service",
    action: "feature_update.archived",
    entityType: "feature_update",
    entityId: update.id,
    source: "product-updates",
    severity: "warning",
    visibility: "admin",
    title: "Feature update archived",
    description: update.title,
    metadata: {
      updateId: update.id,
      slug: update.slug,
      category: update.category,
      version: update.version,
      visibility: update.visibility,
    },
  });

  return update;
}
