import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { notify } from "@/lib/notifications/notify";
import { NotificationError } from "@/lib/notifications/errors";
import type {
  FeatureUpdate,
  FeatureUpdatePublishSummary,
  PublishFeatureUpdateInput,
} from "@/types/feature-updates";
import {
  createSupabaseFeatureUpdateStore,
  type FeatureUpdateStore,
} from "./feature-update-store";
import { resolveFeatureUpdateRecipients } from "./resolve-feature-update-targets";

export async function publishFeatureUpdate(
  input: PublishFeatureUpdateInput,
  dependencies: { store?: FeatureUpdateStore; notifyFn?: typeof notify } = {}
): Promise<{ update: FeatureUpdate; summary: FeatureUpdatePublishSummary }> {
  const store = dependencies.store ?? createSupabaseFeatureUpdateStore();
  const notifyFn = dependencies.notifyFn ?? notify;
  const update = await store.getUpdate(input.updateId);

  if (!update) {
    throw new NotificationError("Feature update not found.", undefined, 404);
  }

  if (update.status === "archived") {
    throw new NotificationError("Archived updates cannot be published.", undefined, 400);
  }

  const targets = await store.listTargets(update.id);
  const recipients = input.notifyUsers
    ? await resolveFeatureUpdateRecipients(
        {
          visibility: update.visibility,
          targets,
          confirmAllUsers: input.confirmAllUsers,
        },
        { store }
      )
    : [];

  const published = await store.publishUpdate(update.id, input.actorId ?? null);
  let notifiedCount = 0;
  let skippedCount = 0;

  if (input.notifyUsers && recipients.length > 0) {
    const results = await Promise.all(
      recipients.map((userId) =>
        notifyFn({
          userId,
          title: "New ChemVault update",
          body: published.summary,
          type: "system",
          source: "product-updates",
          link: `/updates/${published.slug}`,
          metadata: {
            featureUpdateId: published.id,
            category: published.category,
            version: published.version,
            pushPreviewAllowed: input.pushPreviewAllowed === true,
          },
        }).catch(() => null)
      )
    );

    notifiedCount = results.filter(Boolean).length;
    skippedCount = recipients.length - notifiedCount;
  }

  await logAuditEvent({
    actorUserId: input.actorId ?? undefined,
    actorType: input.actorId ? "admin" : "service",
    action: "feature_update.published",
    entityType: "feature_update",
    entityId: published.id,
    source: "product-updates",
    severity: "success",
    visibility: "admin",
    title: "Feature update published",
    description: published.title,
    metadata: {
      updateId: published.id,
      slug: published.slug,
      category: published.category,
      version: published.version,
      visibility: published.visibility,
      notifyUsers: input.notifyUsers === true,
      recipientCount: recipients.length,
      notifiedCount,
      skippedCount,
    },
  });

  return {
    update: published,
    summary: {
      recipientCount: recipients.length,
      notifiedCount,
      skippedCount,
    },
  };
}
