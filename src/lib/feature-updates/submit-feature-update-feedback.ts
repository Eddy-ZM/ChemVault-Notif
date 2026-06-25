import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { NotificationError } from "@/lib/notifications/errors";
import type { FeatureUpdateFeedback } from "@/types/feature-updates";
import { canViewFeatureUpdate } from "./can-view-feature-update";
import {
  createSupabaseFeatureUpdateStore,
  type FeatureUpdateStore,
} from "./feature-update-store";

export async function submitFeatureUpdateFeedback(
  input: {
    updateId: string;
    userId: string;
    feedback: string;
    rating?: number | null;
    isAdmin?: boolean;
  },
  dependencies: { store?: FeatureUpdateStore } = {}
): Promise<FeatureUpdateFeedback> {
  const feedback = input.feedback?.trim();

  if (!feedback) {
    throw new NotificationError("feedback is required.", undefined, 400);
  }

  if (
    typeof input.rating === "number" &&
    (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5)
  ) {
    throw new NotificationError("rating must be between 1 and 5.", undefined, 400);
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
  const result = await store.submitFeedback({
    updateId: input.updateId,
    userId: input.userId,
    feedback,
    rating: input.rating ?? null,
  });

  await logAuditEvent({
    actorUserId: input.userId,
    actorType: input.isAdmin ? "admin" : "user",
    action: "feature_update.feedback_submitted",
    entityType: "feature_update",
    entityId: input.updateId,
    userId: input.userId,
    source: "product-updates",
    severity: "info",
    visibility: "admin",
    title: "Feature update feedback submitted",
    description: update?.title,
    metadata: {
      updateId: input.updateId,
      feedbackId: result.id,
      slug: update?.slug ?? null,
      category: update?.category ?? null,
      version: update?.version ?? null,
      rating: input.rating ?? null,
    },
  });

  return result;
}
