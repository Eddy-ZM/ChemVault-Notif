import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  BroadcastAuditLogInsert,
  BroadcastInsert,
  BroadcastRecipientInsert,
  BroadcastRecipientUpdate,
  BroadcastUpdate,
  Database,
  Json,
  UserSegmentInsert,
  UserSegmentMemberInsert,
  UserSegmentUpdate,
} from "@/lib/supabase/database.types";
import type {
  Broadcast,
  BroadcastAuditLog,
  BroadcastJson,
  BroadcastRecipient,
  BroadcastRecipientStatus,
  BroadcastStatus,
  BroadcastTargetType,
  UserSegment,
  UserSegmentMember,
  UserSegmentType,
} from "@/types/broadcasts";
import {
  toBroadcast,
  toBroadcastAuditLog,
  toBroadcastRecipient,
  toUserSegment,
  toUserSegmentMember,
} from "./transform";

export interface CreateBroadcastInput {
  title: string;
  body: string;
  ignorePreferences?: boolean;
  type: string;
  source: string;
  link?: string | null;
  targetType: BroadcastTargetType;
  targetPayload: BroadcastJson;
  createdBy?: string | null;
}

export interface UpdateBroadcastInput {
  title?: string;
  body?: string;
  ignorePreferences?: boolean;
  type?: string;
  source?: string;
  link?: string | null;
  targetType?: BroadcastTargetType;
  targetPayload?: BroadcastJson;
}

export interface BroadcastStatusUpdate {
  status: BroadcastStatus;
  recipientCount?: number;
  sentBy?: string | null;
  sentAt?: string | null;
}

export interface BroadcastRecipientUpdateInput {
  status: BroadcastRecipientStatus;
  notificationId?: string | null;
  errorMessage?: string | null;
  sentAt?: string | null;
}

export interface InsertAuditLogInput {
  broadcastId: string;
  actorId?: string | null;
  action: string;
  metadata?: BroadcastJson;
}

export interface BroadcastStore {
  getBroadcast(broadcastId: string): Promise<Broadcast | null>;
  listBroadcasts(): Promise<Broadcast[]>;
  createBroadcast(input: CreateBroadcastInput): Promise<Broadcast>;
  updateDraftBroadcast(
    broadcastId: string,
    input: UpdateBroadcastInput
  ): Promise<Broadcast>;
  deleteDraftBroadcast(broadcastId: string): Promise<void>;
  updateBroadcastStatus(
    broadcastId: string,
    update: BroadcastStatusUpdate
  ): Promise<Broadcast>;
  resolveRecipients(
    targetType: BroadcastTargetType,
    targetPayload: BroadcastJson
  ): Promise<string[]>;
  ensureBroadcastRecipients(
    broadcastId: string,
    userIds: string[]
  ): Promise<BroadcastRecipient[]>;
  listBroadcastRecipients(broadcastId: string): Promise<BroadcastRecipient[]>;
  updateBroadcastRecipient(
    recipientId: string,
    update: BroadcastRecipientUpdateInput
  ): Promise<void>;
  insertAuditLog(input: InsertAuditLogInput): Promise<void>;
  listBroadcastAuditLogs(broadcastId: string): Promise<BroadcastAuditLog[]>;
  getProjectMemberUserIds(projectId: string): Promise<string[]>;
  getSegmentMemberUserIds(segmentId: string): Promise<string[]>;
  getAllUserIds(): Promise<string[]>;
  listSegments(): Promise<Array<UserSegment & { memberCount: number }>>;
  getSegment(segmentId: string): Promise<UserSegment | null>;
  createSegment(input: {
    name: string;
    description?: string | null;
    type?: UserSegmentType;
    criteria?: BroadcastJson;
    createdBy?: string | null;
  }): Promise<UserSegment>;
  updateSegment(
    segmentId: string,
    input: {
      name?: string;
      description?: string | null;
      type?: UserSegmentType;
      criteria?: BroadcastJson;
    }
  ): Promise<UserSegment>;
  deleteSegment(segmentId: string): Promise<void>;
  listSegmentMembers(segmentId: string): Promise<UserSegmentMember[]>;
  addSegmentMembers(input: {
    segmentId: string;
    userIds: string[];
    addedBy?: string | null;
  }): Promise<UserSegmentMember[]>;
  removeSegmentMembers(segmentId: string, userIds: string[]): Promise<void>;
}

export function createSupabaseBroadcastStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): BroadcastStore {
  return {
    async getBroadcast(broadcastId) {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("id", broadcastId)
        .maybeSingle();

      if (error) throw error;
      return data ? toBroadcast(data) : null;
    },

    async listBroadcasts() {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data ?? []).map(toBroadcast);
    },

    async createBroadcast(input) {
      const insert: BroadcastInsert = {
        title: input.title,
        body: input.body,
        ignore_preferences: input.ignorePreferences ?? false,
        type: input.type,
        source: input.source,
        link: input.link ?? null,
        target_type: input.targetType,
        target_payload: input.targetPayload as Json,
        created_by: input.createdBy ?? null,
      };
      const { data, error } = await supabase
        .from("broadcasts")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) throw error ?? new Error("Failed to create broadcast.");
      return toBroadcast(data);
    },

    async updateDraftBroadcast(broadcastId, input) {
      const update: BroadcastUpdate = {
        title: input.title,
        body: input.body,
        ignore_preferences: input.ignorePreferences,
        type: input.type,
        source: input.source,
        link: input.link,
        target_type: input.targetType,
        target_payload: input.targetPayload as Json | undefined,
      };
      const { data, error } = await supabase
        .from("broadcasts")
        .update(update)
        .eq("id", broadcastId)
        .eq("status", "draft")
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Only draft broadcasts can be edited.");
      }

      return toBroadcast(data);
    },

    async deleteDraftBroadcast(broadcastId) {
      const { error } = await supabase
        .from("broadcasts")
        .delete()
        .eq("id", broadcastId)
        .in("status", ["draft", "cancelled"]);

      if (error) throw error;
    },

    async updateBroadcastStatus(broadcastId, update) {
      const dbUpdate: BroadcastUpdate = {
        status: update.status,
        recipient_count: update.recipientCount,
        sent_by: update.sentBy,
        sent_at: update.sentAt,
      };
      const { data, error } = await supabase
        .from("broadcasts")
        .update(dbUpdate)
        .eq("id", broadcastId)
        .select("*")
        .single();

      if (error || !data) throw error ?? new Error("Failed to update broadcast.");
      return toBroadcast(data);
    },

    async resolveRecipients(targetType, targetPayload) {
      const { resolveBroadcastRecipients } = await import(
        "./resolve-broadcast-recipients"
      );
      return resolveBroadcastRecipients(
        { targetType, targetPayload },
        { store: this }
      );
    },

    async ensureBroadcastRecipients(broadcastId, userIds) {
      if (userIds.length > 0) {
        const rows: BroadcastRecipientInsert[] = userIds.map((userId) => ({
          broadcast_id: broadcastId,
          user_id: userId,
        }));
        const { error } = await supabase
          .from("broadcast_recipients")
          .upsert(rows, {
            onConflict: "broadcast_id,user_id",
            ignoreDuplicates: true,
          });

        if (error) throw error;
      }

      return this.listBroadcastRecipients(broadcastId);
    },

    async listBroadcastRecipients(broadcastId) {
      const { data, error } = await supabase
        .from("broadcast_recipients")
        .select("*")
        .eq("broadcast_id", broadcastId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(toBroadcastRecipient);
    },

    async updateBroadcastRecipient(recipientId, update) {
      const dbUpdate: BroadcastRecipientUpdate = {
        status: update.status,
        notification_id: update.notificationId,
        error_message: update.errorMessage,
        sent_at: update.sentAt,
      };
      const { error } = await supabase
        .from("broadcast_recipients")
        .update(dbUpdate)
        .eq("id", recipientId);

      if (error) throw error;
    },

    async insertAuditLog(input) {
      const insert: BroadcastAuditLogInsert = {
        broadcast_id: input.broadcastId,
        actor_id: input.actorId ?? null,
        action: input.action,
        metadata: (input.metadata ?? {}) as Json,
      };
      const { error } = await supabase
        .from("broadcast_audit_logs")
        .insert(insert);

      if (error) throw error;
    },

    async listBroadcastAuditLogs(broadcastId) {
      const { data, error } = await supabase
        .from("broadcast_audit_logs")
        .select("*")
        .eq("broadcast_id", broadcastId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data ?? []).map(toBroadcastAuditLog);
    },

    async getProjectMemberUserIds(projectId) {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, conversation_members(user_id)")
        .eq("type", "project")
        .eq("project_id", projectId);

      if (error) throw error;

      return (data ?? []).flatMap((conversation) =>
        (conversation.conversation_members ?? []).map((member) => member.user_id)
      );
    },

    async getSegmentMemberUserIds(segmentId) {
      const { data, error } = await supabase
        .from("user_segment_members")
        .select("user_id")
        .eq("segment_id", segmentId);

      if (error) throw error;
      return (data ?? []).map((member) => member.user_id);
    },

    async getAllUserIds() {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (error) throw error;
      return data.users.map((user) => user.id);
    },

    async listSegments() {
      const { data, error } = await supabase
        .from("user_segments")
        .select("*, user_segment_members(id)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data ?? []).map((row) => ({
        ...toUserSegment(row),
        memberCount: row.user_segment_members?.length ?? 0,
      }));
    },

    async getSegment(segmentId) {
      const { data, error } = await supabase
        .from("user_segments")
        .select("*")
        .eq("id", segmentId)
        .maybeSingle();

      if (error) throw error;
      return data ? toUserSegment(data) : null;
    },

    async createSegment(input) {
      const insert: UserSegmentInsert = {
        name: input.name,
        description: input.description ?? null,
        type: input.type ?? "manual",
        criteria: (input.criteria ?? {}) as Json,
        created_by: input.createdBy ?? null,
      };
      const { data, error } = await supabase
        .from("user_segments")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) throw error ?? new Error("Failed to create segment.");
      return toUserSegment(data);
    },

    async updateSegment(segmentId, input) {
      const update: UserSegmentUpdate = {
        name: input.name,
        description: input.description,
        type: input.type,
        criteria: input.criteria as Json | undefined,
      };
      const { data, error } = await supabase
        .from("user_segments")
        .update(update)
        .eq("id", segmentId)
        .select("*")
        .single();

      if (error || !data) throw error ?? new Error("Failed to update segment.");
      return toUserSegment(data);
    },

    async deleteSegment(segmentId) {
      const { error } = await supabase
        .from("user_segments")
        .delete()
        .eq("id", segmentId);

      if (error) throw error;
    },

    async listSegmentMembers(segmentId) {
      const { data, error } = await supabase
        .from("user_segment_members")
        .select("*")
        .eq("segment_id", segmentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []).map(toUserSegmentMember);
    },

    async addSegmentMembers(input) {
      const rows: UserSegmentMemberInsert[] = input.userIds.map((userId) => ({
        segment_id: input.segmentId,
        user_id: userId,
        added_by: input.addedBy ?? null,
      }));
      const { data, error } = await supabase
        .from("user_segment_members")
        .upsert(rows, {
          onConflict: "segment_id,user_id",
          ignoreDuplicates: true,
        })
        .select("*");

      if (error) throw error;
      return (data ?? []).map(toUserSegmentMember);
    },

    async removeSegmentMembers(segmentId, userIds) {
      if (userIds.length === 0) return;

      const { error } = await supabase
        .from("user_segment_members")
        .delete()
        .eq("segment_id", segmentId)
        .in("user_id", userIds);

      if (error) throw error;
    },
  };
}
