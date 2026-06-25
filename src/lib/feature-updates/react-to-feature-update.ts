import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { NotificationError } from "@/lib/notifications/errors";
import type { FeatureUpdateReaction } from "@/types/feature-updates";
import { canViewFeatureUpdate } from "./can-view-feature-update";
import {
  createSupabaseFeatureUpdateStore,
  type FeatureUpdateStore,
} from "./feature-update-store";
import { isFeatureUpdateReaction } from "./transform";

export async function reactToFeatureUpdate(
  input: {
    updateId: string;
    userId: string;
    reaction: FeatureUpdateReaction | string;
    isAdmin?: boolean;
  },
  dependencies: { store?: FeatureUpdateStore } = {}
): Promise<void> {
  if (!isFeatureUpdateReaction(input.reaction)) {
    throw new NotificationError("Invalid feature update reaction.", undefined, 400);
  }

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
  await store.upsertReaction({
    updateId: input.updateId,
    userId: input.userId,
    reaction: input.reaction,
  });

  await logAuditEvent({
    actorUserId: input.userId,
    actorType: input.isAdmin ? "admin" : "user",
    action: "feature_update.reaction_added",
    entityType: "feature_update",
    entityId: input.updateId,
    userId: input.userId,
    source: "product-updates",
    severity: "info",
    visibility: "admin",
    title: "Feature update reaction added",
    description: update?.title,
    metadata: {
      updateId: input.updateId,
      slug: update?.slug ?? null,
      category: update?.category ?? null,
      version: update?.version ?? null,
      reaction: input.reaction,
    },
  });
}
