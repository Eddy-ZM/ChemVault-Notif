import { timingSafeEqual } from "node:crypto";
import { NotificationError } from "@/lib/notifications/errors";
import type { ApiKeyScope, ServiceApiKeyIdentity } from "@/types/webhooks";
import {
  createSupabaseServiceApiKeyStore,
  type ServiceApiKeyStore,
} from "./api-key-store";
import { hashApiKey } from "./hash-api-key";

export type ApiKeyStore = Pick<
  ServiceApiKeyStore,
  "findByHash" | "updateLastUsedAt"
>;

interface VerifyApiKeyDependencies {
  store?: ApiKeyStore;
}

export async function verifyApiKey(
  rawKey: string,
  requiredScope?: ApiKeyScope,
  dependencies: VerifyApiKeyDependencies = {}
): Promise<ServiceApiKeyIdentity> {
  const trimmedKey = rawKey?.trim();

  if (!isValidApiKeyFormat(trimmedKey)) {
    throw new NotificationError("Invalid API key.", undefined, 401);
  }

  const keyHash = hashApiKey(trimmedKey);
  const store = dependencies.store ?? createSupabaseServiceApiKeyStore();
  const key = await store.findByHash(keyHash);

  if (!key || !safeEqual(key.keyHash, keyHash)) {
    throw new NotificationError("Invalid API key.", undefined, 401);
  }

  if (!key.active) {
    throw new NotificationError("API key is inactive.", undefined, 403);
  }

  if (key.expiresAt && new Date(key.expiresAt).getTime() <= Date.now()) {
    throw new NotificationError("API key has expired.", undefined, 403);
  }

  if (requiredScope && !key.scopes.includes(requiredScope)) {
    throw new NotificationError(
      "API key is missing required scope.",
      undefined,
      403
    );
  }

  await store.updateLastUsedAt(key.id);

  return {
    apiKeyId: key.id,
    serviceName: key.serviceName,
    allowedSources: key.allowedSources,
    scopes: key.scopes,
  };
}

function isValidApiKeyFormat(rawKey: string): boolean {
  return /^cv_(live|test)_[A-Za-z0-9_-]{32,}$/.test(rawKey);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
