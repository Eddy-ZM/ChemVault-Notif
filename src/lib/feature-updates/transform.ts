import type {
  FeatureUpdateFeedbackRow,
  FeatureUpdateReadRow,
  FeatureUpdateReactionRow,
  FeatureUpdateRow,
  FeatureUpdateTargetRow,
  Json,
} from "@/lib/supabase/database.types";
import {
  FEATURE_UPDATE_CATEGORIES,
  FEATURE_UPDATE_FEEDBACK_STATUSES,
  FEATURE_UPDATE_REACTIONS,
  FEATURE_UPDATE_STATUSES,
  FEATURE_UPDATE_TARGET_TYPES,
  FEATURE_UPDATE_VISIBILITIES,
  type FeatureUpdate,
  type FeatureUpdateCategory,
  type FeatureUpdateFeedback,
  type FeatureUpdateFeedbackStatus,
  type FeatureUpdateMetadata,
  type FeatureUpdateReaction,
  type FeatureUpdateReactionRecord,
  type FeatureUpdateRead,
  type FeatureUpdateStatus,
  type FeatureUpdateTarget,
  type FeatureUpdateTargetType,
  type FeatureUpdateVisibility,
} from "@/types/feature-updates";

export function isFeatureUpdateCategory(
  value: unknown
): value is FeatureUpdateCategory {
  return (
    typeof value === "string" &&
    (FEATURE_UPDATE_CATEGORIES as readonly string[]).includes(value)
  );
}

export function isFeatureUpdateStatus(
  value: unknown
): value is FeatureUpdateStatus {
  return (
    typeof value === "string" &&
    (FEATURE_UPDATE_STATUSES as readonly string[]).includes(value)
  );
}

export function isFeatureUpdateVisibility(
  value: unknown
): value is FeatureUpdateVisibility {
  return (
    typeof value === "string" &&
    (FEATURE_UPDATE_VISIBILITIES as readonly string[]).includes(value)
  );
}

export function isFeatureUpdateTargetType(
  value: unknown
): value is FeatureUpdateTargetType {
  return (
    typeof value === "string" &&
    (FEATURE_UPDATE_TARGET_TYPES as readonly string[]).includes(value)
  );
}

export function isFeatureUpdateReaction(
  value: unknown
): value is FeatureUpdateReaction {
  return (
    typeof value === "string" &&
    (FEATURE_UPDATE_REACTIONS as readonly string[]).includes(value)
  );
}

export function isFeatureUpdateFeedbackStatus(
  value: unknown
): value is FeatureUpdateFeedbackStatus {
  return (
    typeof value === "string" &&
    (FEATURE_UPDATE_FEEDBACK_STATUSES as readonly string[]).includes(value)
  );
}

export function toFeatureUpdate(
  row: FeatureUpdateRow,
  extras: { readAt?: string | null; reaction?: string | null } = {}
): FeatureUpdate {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    content: row.content,
    category: isFeatureUpdateCategory(row.category)
      ? row.category
      : "new_feature",
    status: isFeatureUpdateStatus(row.status) ? row.status : "draft",
    visibility: isFeatureUpdateVisibility(row.visibility)
      ? row.visibility
      : "public",
    version: row.version,
    releaseDate: row.release_date,
    publishedAt: row.published_at,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    metadata: normalizeFeatureUpdateMetadata(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    readAt: extras.readAt ?? null,
    reaction: isFeatureUpdateReaction(extras.reaction)
      ? extras.reaction
      : null,
  };
}

export function toFeatureUpdateTarget(
  row: FeatureUpdateTargetRow
): FeatureUpdateTarget {
  return {
    id: row.id,
    featureUpdateId: row.feature_update_id,
    targetType: isFeatureUpdateTargetType(row.target_type)
      ? row.target_type
      : "all_users",
    targetPayload: normalizeFeatureUpdateMetadata(row.target_payload),
    createdAt: row.created_at,
  };
}

export function toFeatureUpdateRead(
  row: FeatureUpdateReadRow
): FeatureUpdateRead {
  return {
    id: row.id,
    featureUpdateId: row.feature_update_id,
    userId: row.user_id,
    readAt: row.read_at,
  };
}

export function toFeatureUpdateReaction(
  row: FeatureUpdateReactionRow
): FeatureUpdateReactionRecord {
  return {
    id: row.id,
    featureUpdateId: row.feature_update_id,
    userId: row.user_id,
    reaction: isFeatureUpdateReaction(row.reaction) ? row.reaction : "useful",
    createdAt: row.created_at,
  };
}

export function toFeatureUpdateFeedback(
  row: FeatureUpdateFeedbackRow
): FeatureUpdateFeedback {
  return {
    id: row.id,
    featureUpdateId: row.feature_update_id,
    userId: row.user_id,
    feedback: row.feedback,
    rating: row.rating,
    status: isFeatureUpdateFeedbackStatus(row.status) ? row.status : "open",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function normalizeFeatureUpdateMetadata(
  value: Json | null | undefined
): FeatureUpdateMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as FeatureUpdateMetadata;
}

export function metadataArray(value: unknown): FeatureUpdateMetadata[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is FeatureUpdateMetadata =>
      Boolean(item) && typeof item === "object" && !Array.isArray(item)
  );
}
