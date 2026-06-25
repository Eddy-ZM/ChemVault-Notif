import type { Json } from "@/lib/supabase/database.types";

export const FEATURE_UPDATE_CATEGORIES = [
  "new_feature",
  "improvement",
  "bug_fix",
  "security",
  "maintenance",
  "breaking_change",
  "experimental",
  "deprecation",
  "announcement",
] as const;

export const FEATURE_UPDATE_STATUSES = [
  "draft",
  "scheduled",
  "published",
  "archived",
] as const;

export const FEATURE_UPDATE_VISIBILITIES = [
  "public",
  "authenticated",
  "admin_only",
  "targeted",
] as const;

export const FEATURE_UPDATE_TARGET_TYPES = [
  "all_users",
  "selected_users",
  "project_members",
  "segment",
  "admins",
  "beta_users",
] as const;

export const FEATURE_UPDATE_REACTIONS = [
  "useful",
  "excited",
  "confused",
  "not_relevant",
] as const;

export const FEATURE_UPDATE_FEEDBACK_STATUSES = [
  "open",
  "reviewed",
  "resolved",
  "archived",
] as const;

export type FeatureUpdateCategory =
  (typeof FEATURE_UPDATE_CATEGORIES)[number];
export type FeatureUpdateStatus = (typeof FEATURE_UPDATE_STATUSES)[number];
export type FeatureUpdateVisibility =
  (typeof FEATURE_UPDATE_VISIBILITIES)[number];
export type FeatureUpdateTargetType =
  (typeof FEATURE_UPDATE_TARGET_TYPES)[number];
export type FeatureUpdateReaction =
  (typeof FEATURE_UPDATE_REACTIONS)[number];
export type FeatureUpdateFeedbackStatus =
  (typeof FEATURE_UPDATE_FEEDBACK_STATUSES)[number];
export type FeatureUpdateMetadata = Record<string, Json>;

export interface FeatureUpdate {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: FeatureUpdateCategory;
  status: FeatureUpdateStatus;
  visibility: FeatureUpdateVisibility;
  version: string | null;
  releaseDate: string | null;
  publishedAt: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  metadata: FeatureUpdateMetadata;
  createdAt: string;
  updatedAt: string;
  readAt?: string | null;
  reaction?: FeatureUpdateReaction | null;
}

export interface FeatureUpdateTarget {
  id: string;
  featureUpdateId: string;
  targetType: FeatureUpdateTargetType;
  targetPayload: FeatureUpdateMetadata;
  createdAt: string;
}

export interface FeatureUpdateRead {
  id: string;
  featureUpdateId: string;
  userId: string;
  readAt: string;
}

export interface FeatureUpdateFeedback {
  id: string;
  featureUpdateId: string;
  userId: string;
  feedback: string;
  rating: number | null;
  status: FeatureUpdateFeedbackStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureUpdateReactionRecord {
  id: string;
  featureUpdateId: string;
  userId: string;
  reaction: FeatureUpdateReaction;
  createdAt: string;
}

export interface CreateFeatureUpdateInput {
  title: string;
  summary: string;
  content: string;
  category?: FeatureUpdateCategory;
  visibility?: FeatureUpdateVisibility;
  version?: string | null;
  releaseDate?: string | null;
  targets?: Array<{
    targetType: FeatureUpdateTargetType;
    targetPayload?: FeatureUpdateMetadata;
  }>;
  metadata?: FeatureUpdateMetadata;
  createdBy?: string | null;
}

export interface PublishFeatureUpdateInput {
  updateId: string;
  actorId?: string | null;
  notifyUsers?: boolean;
  pushPreviewAllowed?: boolean;
  confirmAllUsers?: boolean;
}

export interface FeatureUpdatePublishSummary {
  recipientCount: number;
  notifiedCount: number;
  skippedCount: number;
}
