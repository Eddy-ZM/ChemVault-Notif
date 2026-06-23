import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  Json,
  WebhookEventInsert,
  WebhookEventUpdate,
} from "@/lib/supabase/database.types";
import type {
  WebhookEvent,
  WebhookEventLog,
  WebhookEventStatus,
  WebhookLogLevel,
  WebhookPayload,
} from "@/types/webhooks";
import { toWebhookEvent, toWebhookEventLog } from "./transform";

export interface InsertWebhookEventInput {
  serviceName: string;
  source: string;
  eventType: WebhookEvent["eventType"];
  userId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  conversationId?: string | null;
  payload: WebhookPayload;
  idempotencyKey?: string | null;
}

export interface UpdateWebhookEventStatusInput {
  status: WebhookEventStatus;
  errorMessage?: string | null;
  processedAt?: string | null;
}

export interface InsertWebhookEventLogInput {
  webhookEventId: string;
  level: WebhookLogLevel;
  message: string;
  metadata?: WebhookPayload;
}

export interface WebhookStore {
  findByIdempotencyKey(
    serviceName: string,
    idempotencyKey: string
  ): Promise<WebhookEvent | null>;
  insertEvent(input: InsertWebhookEventInput): Promise<WebhookEvent>;
  getEvent(eventId: string): Promise<WebhookEvent | null>;
  updateEventStatus(
    eventId: string,
    update: UpdateWebhookEventStatusInput
  ): Promise<WebhookEvent>;
  insertLog(input: InsertWebhookEventLogInput): Promise<void>;
  listEvents(filters?: {
    serviceName?: string | null;
    eventType?: string | null;
    status?: string | null;
    limit?: number;
  }): Promise<WebhookEvent[]>;
  listEventLogs(eventId: string): Promise<WebhookEventLog[]>;
}

export function createSupabaseWebhookStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): WebhookStore {
  return {
    async findByIdempotencyKey(serviceName, idempotencyKey) {
      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .eq("service_name", serviceName)
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toWebhookEvent(data) : null;
    },

    async insertEvent(input) {
      const insert: WebhookEventInsert = {
        service_name: input.serviceName,
        source: input.source,
        event_type: input.eventType,
        user_id: input.userId ?? null,
        project_id: input.projectId ?? null,
        task_id: input.taskId ?? null,
        conversation_id: input.conversationId ?? null,
        payload: input.payload as Json,
        idempotency_key: input.idempotencyKey ?? null,
      };
      const { data, error } = await supabase
        .from("webhook_events")
        .insert(insert)
        .select("*")
        .single();

      if (isUniqueViolation(error) && input.idempotencyKey) {
        const existing = await this.findByIdempotencyKey(
          input.serviceName,
          input.idempotencyKey
        );

        if (existing) {
          return existing;
        }
      }

      if (error || !data) {
        throw error ?? new Error("Failed to create webhook event.");
      }

      return toWebhookEvent(data);
    },

    async getEvent(eventId) {
      const { data, error } = await supabase
        .from("webhook_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toWebhookEvent(data) : null;
    },

    async updateEventStatus(eventId, update) {
      const dbUpdate: WebhookEventUpdate = {
        status: update.status,
        error_message: update.errorMessage,
        processed_at: update.processedAt,
      };
      const { data, error } = await supabase
        .from("webhook_events")
        .update(dbUpdate)
        .eq("id", eventId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update webhook event.");
      }

      return toWebhookEvent(data);
    },

    async insertLog(input) {
      const { error } = await supabase.from("webhook_event_logs").insert({
        webhook_event_id: input.webhookEventId,
        level: input.level,
        message: input.message,
        metadata: (input.metadata ?? {}) as Json,
      });

      if (error) {
        throw error;
      }
    },

    async listEvents(filters = {}) {
      let query = supabase
        .from("webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(filters.limit ?? 100);

      if (filters.serviceName) {
        query = query.eq("service_name", filters.serviceName);
      }

      if (filters.eventType) {
        query = query.eq("event_type", filters.eventType);
      }

      if (filters.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data ?? []).map(toWebhookEvent);
    },

    async listEventLogs(eventId) {
      const { data, error } = await supabase
        .from("webhook_event_logs")
        .select("*")
        .eq("webhook_event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toWebhookEventLog);
    },
  };
}

function isUniqueViolation(error: unknown) {
  return (
    Boolean(error) &&
    typeof error === "object" &&
    (error as { code?: unknown }).code === "23505"
  );
}
