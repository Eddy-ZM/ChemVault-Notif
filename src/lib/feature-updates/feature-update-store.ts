import type { SupabaseClient } from "@supabase/supabase-js";
import { getAdminEmails, isAdminEmail } from "@/lib/auth/require-admin";
import { NotificationError } from "@/lib/notifications/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  FeatureUpdateFeedbackInsert,
  FeatureUpdateFeedbackUpdate,
  FeatureUpdateInsert,
  FeatureUpdateReadInsert,
  FeatureUpdateReactionInsert,
  FeatureUpdateTargetInsert,
  FeatureUpdateUpdate,
  Json,
} from "@/lib/supabase/database.types";
import type {
  CreateFeatureUpdateInput,
  FeatureUpdate,
  FeatureUpdateCategory,
  FeatureUpdateFeedback,
  FeatureUpdateFeedbackStatus,
  FeatureUpdateMetadata,
  FeatureUpdateReaction,
  FeatureUpdateTarget,
  FeatureUpdateTargetType,
  FeatureUpdateVisibility,
} from "@/types/feature-updates";
import {
  isFeatureUpdateCategory,
  isFeatureUpdateFeedbackStatus,
  isFeatureUpdateReaction,
  isFeatureUpdateTargetType,
  isFeatureUpdateVisibility,
  toFeatureUpdate,
  toFeatureUpdateFeedback,
  toFeatureUpdateTarget,
} from "./transform";

export interface FeatureUpdateTargetInput {
  targetType: FeatureUpdateTargetType;
  targetPayload?: FeatureUpdateMetadata;
}

export interface FeatureUpdateListFilters {
  status?: string | null;
  category?: string | null;
  visibility?: string | null;
  version?: string | null;
  limit?: number;
  cursor?: string | null;
}

export interface VisibleFeatureUpdateFilters {
  userId?: string | null;
  isAdmin?: boolean;
  category?: string | null;
  version?: string | null;
  unreadOnly?: boolean;
  limit?: number;
  cursor?: string | null;
}

export interface FeatureUpdateFeedbackFilters {
  featureUpdateId?: string | null;
  status?: string | null;
  limit?: number;
}

export interface FeatureUpdateStats {
  readCount: number;
  reactions: Record<FeatureUpdateReaction, number>;
  feedbackCount: number;
  notificationCount: number;
}

export interface FeatureUpdateStore {
  slugExists(slug: string, excludeUpdateId?: string): Promise<boolean>;
  createUpdate(
    input: CreateFeatureUpdateInput & { slug: string }
  ): Promise<FeatureUpdate>;
  updateDraftUpdate(
    updateId: string,
    input: Partial<CreateFeatureUpdateInput> & { slug?: string }
  ): Promise<FeatureUpdate>;
  publishUpdate(updateId: string, actorId?: string | null): Promise<FeatureUpdate>;
  archiveUpdate(updateId: string, actorId?: string | null): Promise<FeatureUpdate>;
  getUpdate(updateId: string): Promise<FeatureUpdate | null>;
  getUpdateBySlug(slug: string): Promise<FeatureUpdate | null>;
  listTargets(updateId: string): Promise<FeatureUpdateTarget[]>;
  replaceTargets(
    updateId: string,
    targets: FeatureUpdateTargetInput[]
  ): Promise<FeatureUpdateTarget[]>;
  listAdminUpdates(filters?: FeatureUpdateListFilters): Promise<FeatureUpdate[]>;
  listVisibleUpdates(
    filters?: VisibleFeatureUpdateFilters
  ): Promise<FeatureUpdate[]>;
  markRead(updateId: string, userId: string): Promise<void>;
  upsertReaction(input: {
    updateId: string;
    userId: string;
    reaction: FeatureUpdateReaction;
  }): Promise<void>;
  submitFeedback(input: {
    updateId: string;
    userId: string;
    feedback: string;
    rating?: number | null;
  }): Promise<FeatureUpdateFeedback>;
  listFeedback(
    filters?: FeatureUpdateFeedbackFilters
  ): Promise<FeatureUpdateFeedback[]>;
  updateFeedbackStatus(
    feedbackId: string,
    status: FeatureUpdateFeedbackStatus
  ): Promise<FeatureUpdateFeedback>;
  getStats(updateId: string): Promise<FeatureUpdateStats>;
  getAllUserIds(): Promise<string[]>;
  getProjectMemberUserIds(projectId: string): Promise<string[]>;
  getSegmentMemberUserIds(segmentId: string): Promise<string[]>;
  getAdminUserIds(): Promise<string[]>;
  getBetaUserIds(): Promise<string[]>;
}

export function createSupabaseFeatureUpdateStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): FeatureUpdateStore {
  return {
    async slugExists(slug, excludeUpdateId) {
      let query = supabase.from("feature_updates").select("id").eq("slug", slug);

      if (excludeUpdateId) {
        query = query.neq("id", excludeUpdateId);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },

    async createUpdate(input) {
      const insert: FeatureUpdateInsert = {
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        content: input.content,
        category: input.category ?? "new_feature",
        status: "draft",
        visibility: input.visibility ?? "public",
        version: normalizeNullableString(input.version),
        release_date: normalizeNullableString(input.releaseDate),
        created_by: input.createdBy ?? null,
        updated_by: input.createdBy ?? null,
        metadata: (input.metadata ?? {}) as Json,
      };
      const { data, error } = await supabase
        .from("feature_updates")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create feature update.");
      }

      return toFeatureUpdate(data);
    },

    async updateDraftUpdate(updateId, input) {
      const update: FeatureUpdateUpdate = {
        title: input.title,
        slug: input.slug,
        summary: input.summary,
        content: input.content,
        category: input.category,
        visibility: input.visibility,
        version: input.version,
        release_date: input.releaseDate,
        updated_by: input.createdBy ?? null,
        metadata: input.metadata as Json | undefined,
      };
      const { data, error } = await supabase
        .from("feature_updates")
        .update(removeUndefined(update))
        .eq("id", updateId)
        .in("status", ["draft", "scheduled"])
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new NotificationError("Only draft updates can be edited.");
      }

      return toFeatureUpdate(data);
    },

    async publishUpdate(updateId, actorId) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("feature_updates")
        .update({
          status: "published",
          published_at: now,
          release_date: now,
          updated_by: actorId ?? null,
        })
        .eq("id", updateId)
        .neq("status", "archived")
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to publish feature update.");
      }

      return toFeatureUpdate(data);
    },

    async archiveUpdate(updateId, actorId) {
      const { data, error } = await supabase
        .from("feature_updates")
        .update({
          status: "archived",
          updated_by: actorId ?? null,
        })
        .eq("id", updateId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to archive feature update.");
      }

      return toFeatureUpdate(data);
    },

    async getUpdate(updateId) {
      const { data, error } = await supabase
        .from("feature_updates")
        .select("*")
        .eq("id", updateId)
        .maybeSingle();

      if (error) throw error;
      return data ? toFeatureUpdate(data) : null;
    },

    async getUpdateBySlug(slug) {
      const { data, error } = await supabase
        .from("feature_updates")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data ? toFeatureUpdate(data) : null;
    },

    async listTargets(updateId) {
      const { data, error } = await supabase
        .from("feature_update_targets")
        .select("*")
        .eq("feature_update_id", updateId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(toFeatureUpdateTarget);
    },

    async replaceTargets(updateId, targets) {
      const { error: deleteError } = await supabase
        .from("feature_update_targets")
        .delete()
        .eq("feature_update_id", updateId);

      if (deleteError) throw deleteError;

      const rows: FeatureUpdateTargetInsert[] = targets.map((target) => ({
        feature_update_id: updateId,
        target_type: target.targetType,
        target_payload: (target.targetPayload ?? {}) as Json,
      }));

      if (rows.length === 0) {
        return [];
      }

      const { data, error } = await supabase
        .from("feature_update_targets")
        .insert(rows)
        .select("*");

      if (error) throw error;
      return (data ?? []).map(toFeatureUpdateTarget);
    },

    async listAdminUpdates(filters = {}) {
      let query = supabase
        .from("feature_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(normalizeLimit(filters.limit, 100));

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      if (filters.visibility) {
        query = query.eq("visibility", filters.visibility);
      }

      if (filters.version) {
        query = query.eq("version", filters.version);
      }

      if (filters.cursor) {
        query = query.lt("created_at", filters.cursor);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map((row) => toFeatureUpdate(row));
    },

    async listVisibleUpdates(filters = {}) {
      const self = this as InternalFeatureUpdateStore;
      const userId = normalizeNullableString(filters.userId);
      let query = supabase
        .from("feature_updates")
        .select("*")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(normalizeLimit(filters.limit, 50) * 3);

      if (filters.category) {
        query = query.eq("category", filters.category);
      }

      if (filters.version) {
        query = query.eq("version", filters.version);
      }

      if (filters.cursor) {
        query = query.lt("published_at", filters.cursor);
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data ?? [];
      const updateIds = rows.map((row) => row.id);
      const [targetsByUpdate, readsByUpdate, reactionsByUpdate] =
        await Promise.all([
          self.listTargetsByUpdateIds(updateIds),
          userId ? self.listReadTimesByUpdateIds(updateIds, userId) : new Map(),
          userId ? self.listReactionsByUpdateIds(updateIds, userId) : new Map(),
        ]);

      const visible: FeatureUpdate[] = [];

      for (const row of rows) {
        const update = toFeatureUpdate(row, {
          readAt: readsByUpdate.get(row.id) ?? null,
          reaction: reactionsByUpdate.get(row.id) ?? null,
        });

        if (
          await canViewUpdateWithTargets({
            update,
            targets: targetsByUpdate.get(row.id) ?? [],
            userId,
            isAdmin: filters.isAdmin ?? false,
            store: this,
          })
        ) {
          if (!filters.unreadOnly || !update.readAt) {
            visible.push(update);
          }
        }

        if (visible.length >= normalizeLimit(filters.limit, 50)) {
          break;
        }
      }

      return visible;
    },

    async markRead(updateId, userId) {
      const insert: FeatureUpdateReadInsert = {
        feature_update_id: updateId,
        user_id: userId,
        read_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from("feature_update_reads")
        .upsert(insert, {
          onConflict: "feature_update_id,user_id",
          ignoreDuplicates: false,
        });

      if (error) throw error;
    },

    async upsertReaction(input) {
      const insert: FeatureUpdateReactionInsert = {
        feature_update_id: input.updateId,
        user_id: input.userId,
        reaction: input.reaction,
      };
      const { error } = await supabase
        .from("feature_update_reactions")
        .upsert(insert, {
          onConflict: "feature_update_id,user_id",
          ignoreDuplicates: false,
        });

      if (error) throw error;
    },

    async submitFeedback(input) {
      const insert: FeatureUpdateFeedbackInsert = {
        feature_update_id: input.updateId,
        user_id: input.userId,
        feedback: input.feedback,
        rating: input.rating ?? null,
      };
      const { data, error } = await supabase
        .from("feature_update_feedback")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to submit feature update feedback.");
      }

      return toFeatureUpdateFeedback(data);
    },

    async listFeedback(filters = {}) {
      let query = supabase
        .from("feature_update_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(normalizeLimit(filters.limit, 100));

      if (filters.featureUpdateId) {
        query = query.eq("feature_update_id", filters.featureUpdateId);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []).map(toFeatureUpdateFeedback);
    },

    async updateFeedbackStatus(feedbackId, status) {
      const update: FeatureUpdateFeedbackUpdate = { status };
      const { data, error } = await supabase
        .from("feature_update_feedback")
        .update(update)
        .eq("id", feedbackId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update feedback status.");
      }

      return toFeatureUpdateFeedback(data);
    },

    async getStats(updateId) {
      const [readCount, reactions, feedbackCount, notificationCount] =
        await Promise.all([
          countRows(supabase, "feature_update_reads", {
            feature_update_id: updateId,
          }),
          reactionCounts(supabase, updateId),
          countRows(supabase, "feature_update_feedback", {
            feature_update_id: updateId,
          }),
          notificationCountForUpdate(supabase, updateId),
        ]);

      return {
        readCount,
        reactions,
        feedbackCount,
        notificationCount,
      };
    },

    async getAllUserIds() {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (error) throw error;
      return data.users.map((user) => user.id);
    },

    async getProjectMemberUserIds(projectId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, conversation_members(user_id)")
        .eq("type", "project")
        .eq("project_id", projectId);

      if (error) throw error;

      return uniqueUserIds(
        (data ?? []).flatMap((conversation) =>
          (conversation.conversation_members ?? []).map((member) => member.user_id)
        )
      );
    },

    async getSegmentMemberUserIds(segmentId) {
      const { data, error } = await supabase
        .from("user_segment_members")
        .select("user_id")
        .eq("segment_id", segmentId);

      if (error) throw error;
      return uniqueUserIds((data ?? []).map((member) => member.user_id));
    },

    async getAdminUserIds() {
      const adminEmails = getAdminEmails();

      if (adminEmails.length === 0) {
        return [];
      }

      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (error) throw error;
      return data.users
        .filter((user) => isAdminEmail(user.email))
        .map((user) => user.id);
    },

    async getBetaUserIds() {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (error) throw error;
      return data.users
        .filter((user) => {
          const metadata = user.app_metadata ?? {};
          return (
            metadata.beta === true ||
            metadata.beta_user === true ||
            metadata.role === "beta"
          );
        })
        .map((user) => user.id);
    },

    async listTargetsByUpdateIds(updateIds: string[]) {
      if (updateIds.length === 0) {
        return new Map<string, FeatureUpdateTarget[]>();
      }

      const { data, error } = await supabase
        .from("feature_update_targets")
        .select("*")
        .in("feature_update_id", updateIds);

      if (error) throw error;

      const grouped = new Map<string, FeatureUpdateTarget[]>();
      for (const row of data ?? []) {
        const target = toFeatureUpdateTarget(row);
        grouped.set(target.featureUpdateId, [
          ...(grouped.get(target.featureUpdateId) ?? []),
          target,
        ]);
      }
      return grouped;
    },

    async listReadTimesByUpdateIds(updateIds: string[], userId: string) {
      if (updateIds.length === 0) {
        return new Map<string, string>();
      }

      const { data, error } = await supabase
        .from("feature_update_reads")
        .select("feature_update_id, read_at")
        .eq("user_id", userId)
        .in("feature_update_id", updateIds);

      if (error) throw error;

      return new Map(
        (data ?? []).map((row) => [row.feature_update_id, row.read_at])
      );
    },

    async listReactionsByUpdateIds(updateIds: string[], userId: string) {
      if (updateIds.length === 0) {
        return new Map<string, string>();
      }

      const { data, error } = await supabase
        .from("feature_update_reactions")
        .select("feature_update_id, reaction")
        .eq("user_id", userId)
        .in("feature_update_id", updateIds);

      if (error) throw error;

      return new Map(
        (data ?? []).map((row) => [row.feature_update_id, row.reaction])
      );
    },
  } as FeatureUpdateStore & InternalFeatureUpdateStore;
}

interface InternalFeatureUpdateStore extends FeatureUpdateStore {
  listTargetsByUpdateIds(
    updateIds: string[]
  ): Promise<Map<string, FeatureUpdateTarget[]>>;
  listReadTimesByUpdateIds(
    updateIds: string[],
    userId: string
  ): Promise<Map<string, string>>;
  listReactionsByUpdateIds(
    updateIds: string[],
    userId: string
  ): Promise<Map<string, string>>;
}

async function canViewUpdateWithTargets(input: {
  update: FeatureUpdate;
  targets: FeatureUpdateTarget[];
  userId: string | null;
  isAdmin: boolean;
  store: FeatureUpdateStore;
}): Promise<boolean> {
  if (input.isAdmin) {
    return true;
  }

  if (input.update.status !== "published") {
    return false;
  }

  if (input.update.visibility === "public") {
    return true;
  }

  if (!input.userId) {
    return false;
  }

  if (input.update.visibility === "authenticated") {
    return true;
  }

  if (input.update.visibility === "admin_only") {
    return (await input.store.getAdminUserIds()).includes(input.userId);
  }

  if (input.update.visibility !== "targeted") {
    return false;
  }

  if (input.targets.length === 0) {
    return false;
  }

  for (const target of input.targets) {
    const userIds = await resolveTargetUserIds(input.store, target);
    if (userIds.includes(input.userId)) {
      return true;
    }
  }

  return false;
}

async function resolveTargetUserIds(
  store: FeatureUpdateStore,
  target: FeatureUpdateTarget
): Promise<string[]> {
  switch (target.targetType) {
    case "all_users":
      return store.getAllUserIds();
    case "selected_users":
      return uniqueUserIds(arrayValue(target.targetPayload.userIds));
    case "project_members":
      return store.getProjectMemberUserIds(
        requiredPayloadString(target.targetPayload.projectId, "projectId")
      );
    case "segment":
      return store.getSegmentMemberUserIds(
        requiredPayloadString(target.targetPayload.segmentId, "segmentId")
      );
    case "admins":
      return store.getAdminUserIds();
    case "beta_users":
      return uniqueUserIds([
        ...arrayValue(target.targetPayload.userIds),
        ...(await store.getBetaUserIds()),
      ]);
  }
}

async function countRows(
  supabase: SupabaseClient<Database>,
  table:
    | "feature_update_reads"
    | "feature_update_feedback"
    | "notifications",
  filters: Record<string, string>
): Promise<number> {
  let query = supabase.from(table).select("*", { count: "exact", head: true });

  for (const [field, value] of Object.entries(filters)) {
    query = query.eq(field, value);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

async function reactionCounts(
  supabase: SupabaseClient<Database>,
  updateId: string
): Promise<Record<FeatureUpdateReaction, number>> {
  const { data, error } = await supabase
    .from("feature_update_reactions")
    .select("reaction")
    .eq("feature_update_id", updateId);

  if (error) throw error;

  const counts: Record<FeatureUpdateReaction, number> = {
    useful: 0,
    excited: 0,
    confused: 0,
    not_relevant: 0,
  };

  for (const row of data ?? []) {
    if (isFeatureUpdateReaction(row.reaction)) {
      counts[row.reaction] += 1;
    }
  }

  return counts;
}

async function notificationCountForUpdate(
  supabase: SupabaseClient<Database>,
  updateId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .contains("metadata", { featureUpdateId: updateId });

  if (error) throw error;
  return count ?? 0;
}

function normalizeLimit(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(Math.max(Math.floor(value), 1), 200);
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function removeUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function uniqueUserIds(values: unknown[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(isValidUuid)
    ),
  ];
}

function requiredPayloadString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  throw new NotificationError(`${field} is required.`, undefined, 400);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function normalizeFeatureUpdateTargetInput(
  target: unknown
): FeatureUpdateTargetInput | null {
  if (!target || typeof target !== "object" || Array.isArray(target)) {
    return null;
  }

  const record = target as Record<string, unknown>;
  const targetType = record.targetType ?? record.target_type;

  if (!isFeatureUpdateTargetType(targetType)) {
    return null;
  }

  return {
    targetType,
    targetPayload:
      record.targetPayload &&
      typeof record.targetPayload === "object" &&
      !Array.isArray(record.targetPayload)
        ? (record.targetPayload as FeatureUpdateMetadata)
        : {},
  };
}

export function normalizeFeatureUpdateFilters(searchParams: URLSearchParams) {
  return {
    status: searchParams.get("status"),
    category: searchParams.get("category"),
    visibility: searchParams.get("visibility"),
    version: searchParams.get("version"),
    limit: numberParam(searchParams.get("limit")),
    cursor: searchParams.get("cursor"),
  };
}

export function normalizeVisibleFeatureUpdateFilters(
  searchParams: URLSearchParams
) {
  return {
    category: searchParams.get("category"),
    version: searchParams.get("version"),
    unreadOnly: searchParams.get("unreadOnly") === "true",
    limit: numberParam(searchParams.get("limit")),
    cursor: searchParams.get("cursor"),
  };
}

export function validateFeatureUpdateCategory(
  value: unknown
): FeatureUpdateCategory | undefined {
  return isFeatureUpdateCategory(value) ? value : undefined;
}

export function validateFeatureUpdateVisibility(
  value: unknown
): FeatureUpdateVisibility | undefined {
  return isFeatureUpdateVisibility(value) ? value : undefined;
}

export function validateFeatureUpdateFeedbackStatus(
  value: unknown
): FeatureUpdateFeedbackStatus | null {
  return isFeatureUpdateFeedbackStatus(value) ? value : null;
}

function numberParam(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
