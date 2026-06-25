import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { NotificationError } from "@/lib/notifications/errors";
import type {
  CreateFeatureUpdateInput,
  FeatureUpdate,
} from "@/types/feature-updates";
import {
  createSupabaseFeatureUpdateStore,
  normalizeFeatureUpdateTargetInput,
  type FeatureUpdateStore,
} from "./feature-update-store";
import { generateFeatureUpdateSlug } from "./slug";
import {
  isFeatureUpdateCategory,
  isFeatureUpdateVisibility,
} from "./transform";

export async function createFeatureUpdate(
  input: CreateFeatureUpdateInput,
  dependencies: { store?: FeatureUpdateStore } = {}
): Promise<FeatureUpdate> {
  const store = dependencies.store ?? createSupabaseFeatureUpdateStore();
  const normalized = validateCreateFeatureUpdateInput(input);
  const slug = await generateFeatureUpdateSlug(
    normalized.title,
    normalized.version,
    {
      slugExists: (candidate) => store.slugExists(candidate),
    }
  );

  const update = await store.createUpdate({
    ...normalized,
    slug,
  });
  const targets = (input.targets ?? [])
    .map(normalizeFeatureUpdateTargetInput)
    .filter((target): target is NonNullable<typeof target> => Boolean(target));

  if (targets.length > 0) {
    await store.replaceTargets(update.id, targets);
  }

  await logAuditEvent({
    actorUserId: normalized.createdBy ?? undefined,
    actorType: normalized.createdBy ? "admin" : "service",
    action: "feature_update.created",
    entityType: "feature_update",
    entityId: update.id,
    source: "product-updates",
    severity: "info",
    visibility: "admin",
    title: "Feature update created",
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

function validateCreateFeatureUpdateInput(
  input: CreateFeatureUpdateInput
): Required<
  Pick<CreateFeatureUpdateInput, "title" | "summary" | "content">
> &
  CreateFeatureUpdateInput {
  const title = input.title?.trim();
  const summary = input.summary?.trim();
  const content = input.content?.trim();

  if (!title) {
    throw new NotificationError("title is required.", undefined, 400);
  }

  if (!summary) {
    throw new NotificationError("summary is required.", undefined, 400);
  }

  if (!content) {
    throw new NotificationError("content is required.", undefined, 400);
  }

  if (input.category && !isFeatureUpdateCategory(input.category)) {
    throw new NotificationError("Invalid feature update category.", undefined, 400);
  }

  if (input.visibility && !isFeatureUpdateVisibility(input.visibility)) {
    throw new NotificationError("Invalid feature update visibility.", undefined, 400);
  }

  return {
    ...input,
    title,
    summary,
    content,
    category: input.category ?? "new_feature",
    visibility: input.visibility ?? "public",
    version: input.version?.trim() || null,
    releaseDate: input.releaseDate?.trim() || null,
    metadata: input.metadata ?? {},
  };
}
