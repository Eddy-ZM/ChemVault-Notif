import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  ServiceApiKeyInsert,
  ServiceApiKeyRow,
} from "@/lib/supabase/database.types";
import {
  API_KEY_SCOPES,
  type ApiKeyScope,
  type ServiceApiKey,
} from "@/types/webhooks";

export interface CreateServiceApiKeyRecordInput {
  name: string;
  keyHash: string;
  keyPrefix: string;
  serviceName: string;
  allowedSources: string[];
  scopes: ApiKeyScope[];
  expiresAt?: string | null;
  createdBy?: string | null;
}

export interface ServiceApiKeyStore {
  findByHash(keyHash: string): Promise<ServiceApiKey | null>;
  listKeys(): Promise<ServiceApiKey[]>;
  createKey(input: CreateServiceApiKeyRecordInput): Promise<ServiceApiKey>;
  updateLastUsedAt(apiKeyId: string): Promise<void>;
  updateActive(apiKeyId: string, active: boolean): Promise<ServiceApiKey>;
}

export function createSupabaseServiceApiKeyStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): ServiceApiKeyStore {
  return {
    async findByHash(keyHash) {
      const { data, error } = await supabase
        .from("service_api_keys")
        .select("*")
        .eq("key_hash", keyHash)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toServiceApiKey(data) : null;
    },

    async listKeys() {
      const { data, error } = await supabase
        .from("service_api_keys")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toServiceApiKey);
    },

    async createKey(input) {
      const insert: ServiceApiKeyInsert = {
        name: input.name,
        key_hash: input.keyHash,
        key_prefix: input.keyPrefix,
        service_name: input.serviceName,
        allowed_sources: input.allowedSources,
        scopes: input.scopes,
        expires_at: input.expiresAt ?? null,
        created_by: input.createdBy ?? null,
      };
      const { data, error } = await supabase
        .from("service_api_keys")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create service API key.");
      }

      return toServiceApiKey(data);
    },

    async updateLastUsedAt(apiKeyId) {
      const { error } = await supabase
        .from("service_api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", apiKeyId);

      if (error) {
        throw error;
      }
    },

    async updateActive(apiKeyId, active) {
      const { data, error } = await supabase
        .from("service_api_keys")
        .update({ active })
        .eq("id", apiKeyId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update service API key.");
      }

      return toServiceApiKey(data);
    },
  };
}

export function toServiceApiKey(row: ServiceApiKeyRow): ServiceApiKey {
  return {
    id: row.id,
    name: row.name,
    keyHash: row.key_hash,
    keyPrefix: row.key_prefix,
    serviceName: row.service_name,
    allowedSources: row.allowed_sources ?? [],
    scopes: normalizeScopes(row.scopes ?? []),
    active: row.active,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeScopes(scopes: string[]): ApiKeyScope[] {
  return scopes.filter((scope): scope is ApiKeyScope =>
    (API_KEY_SCOPES as readonly string[]).includes(scope)
  );
}
