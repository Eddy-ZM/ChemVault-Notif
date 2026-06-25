import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { NotificationError } from "@/lib/notifications/errors";
import {
  createSupabaseFeatureUpdateStore,
  type FeatureUpdateStore,
} from "./feature-update-store";
import { canViewFeatureUpdate } from "./can-view-feature-update";

export async function markFeatureUpdateRead(
  input: { updateId: string; userId: string; isAdmin?: boolean },
  dependencies: { store?: FeatureUpdateStore } = {}
): Promise<void> {
  const store = dependencies.store ?? createSupabaseFeatureUpdateStore();
  const canView = await canViewFeatureUpdate({
    updateId: input.updateId,
    userId: input.userId,
    isAdmin: input.isAdmin,
    store,
  });

  if (!canView) {
    throw new NotificationError("Feature update not found.", undefined, 404);
  }

  const update = await store.getUpdate(input.updateId);
  await store.markRead(input.updateId, input.userId);

  await logAuditEvent({
    actorUserId: input.userId,
    actorType: input.isAdmin ? "admin" : "user",
    action: "feature_update.read",
    entityType: "feature_update",
    entityId: input.updateId,
    userId: input.userId,
    source: "product-updates",
    severity: "info",
    visibility: "admin",
    title: "Feature update read",
    description: update?.title,
    metadata: {
      updateId: input.updateId,
      slug: update?.slug ?? null,
      category: update?.category ?? null,
      version: update?.version ?? null,
    },
  });
}
