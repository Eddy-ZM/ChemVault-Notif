import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  createSupabaseFeatureUpdateStore,
  normalizeFeatureUpdateTargetInput,
} from "@/lib/feature-updates/feature-update-store";
import { generateFeatureUpdateSlug } from "@/lib/feature-updates/slug";
import {
  isFeatureUpdateCategory,
  isFeatureUpdateVisibility,
} from "@/lib/feature-updates/transform";
import { NotificationError } from "@/lib/notifications/errors";
import type {
  FeatureUpdateCategory,
  FeatureUpdateMetadata,
  FeatureUpdateVisibility,
} from "@/types/feature-updates";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminUser();
    const params = await context.params;
    const store = createSupabaseFeatureUpdateStore();
    const [update, targets, stats] = await Promise.all([
      store.getUpdate(params.id),
      store.listTargets(params.id),
      store.getStats(params.id),
    ]);

    if (!update) {
      throw new NotificationError("Feature update not found.", undefined, 404);
    }

    return NextResponse.json({ update, targets, stats });
  } catch (error) {
    return jsonError(error, "Failed to load feature update.");
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdminUser();
    const params = await context.params;
    const body = await parseJson(request);
    const store = createSupabaseFeatureUpdateStore();
    const current = await store.getUpdate(params.id);

    if (!current) {
      throw new NotificationError("Feature update not found.", undefined, 404);
    }

    if (current.status !== "draft" && current.status !== "scheduled") {
      throw new NotificationError(
        "Only draft or scheduled updates can be edited.",
        undefined,
        400
      );
    }

    const parsed = parsePartialFeatureUpdateInput(body);
    const titleForSlug = parsed.title ?? current.title;
    const versionForSlug =
      parsed.version === undefined ? current.version : parsed.version;
    const shouldRegenerateSlug =
      parsed.title !== undefined || parsed.version !== undefined;
    const slug = shouldRegenerateSlug
      ? await generateFeatureUpdateSlug(titleForSlug, versionForSlug, {
          slugExists: (candidate) => store.slugExists(candidate, current.id),
        })
      : undefined;

    const update = await store.updateDraftUpdate(params.id, {
      ...parsed,
      slug,
      createdBy: user.id,
    });

    if (parsed.targets) {
      await store.replaceTargets(update.id, parsed.targets);
    }

    await logAuditEvent({
      actorUserId: user.id,
      actorType: "admin",
      action: "feature_update.updated",
      entityType: "feature_update",
      entityId: update.id,
      source: "product-updates",
      severity: "info",
      visibility: "admin",
      title: "Feature update updated",
      description: update.title,
      metadata: {
        updateId: update.id,
        slug: update.slug,
        category: update.category,
        version: update.version,
        visibility: update.visibility,
      },
    });

    return NextResponse.json({ update });
  } catch (error) {
    return jsonError(error, "Failed to update feature update.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parsePartialFeatureUpdateInput(body: unknown) {
  if (!isRecord(body)) {
    throw new NotificationError("Request body is required.", undefined, 400);
  }

  const categoryValue = optionalString(body.category);
  const visibilityValue = optionalString(body.visibility);
  let category: FeatureUpdateCategory | undefined;
  let visibility: FeatureUpdateVisibility | undefined;

  if (categoryValue) {
    if (!isFeatureUpdateCategory(categoryValue)) {
      throw new NotificationError("Invalid category.", undefined, 400);
    }
    category = categoryValue;
  }

  if (visibilityValue) {
    if (!isFeatureUpdateVisibility(visibilityValue)) {
      throw new NotificationError("Invalid visibility.", undefined, 400);
    }
    visibility = visibilityValue;
  }

  return {
    title: optionalString(body.title),
    summary: optionalString(body.summary),
    content: optionalString(body.content),
    category,
    visibility,
    version: body.version === null ? null : optionalString(body.version),
    releaseDate:
      body.releaseDate === null ? null : optionalString(body.releaseDate),
    targets: Array.isArray(body.targets)
      ? body.targets
          .map(normalizeFeatureUpdateTargetInput)
          .filter((target): target is NonNullable<typeof target> =>
            Boolean(target)
          )
      : undefined,
    metadata: isRecord(body.metadata)
      ? (body.metadata as FeatureUpdateMetadata)
      : undefined,
  };
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
