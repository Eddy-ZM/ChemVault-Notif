import { createHash, randomBytes } from "node:crypto";

export type ApiKeyMode = "test" | "live";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function generateApiKey({ mode }: { mode: ApiKeyMode }): string {
  const secret = randomBytes(24).toString("base64url");
  return `cv_${mode}_${secret}`;
}

export function getApiKeyPrefix(rawKey: string): string {
  const match = /^(cv_(?:live|test)_)([A-Za-z0-9_-]{4})/.exec(rawKey);

  if (!match) {
    return `${rawKey.slice(0, 12)}...`;
  }

  return `${match[1]}${match[2]}...`;
}
