import { describe, expect, it } from "vitest";
import { hashApiKey } from "./hash-api-key";
import { verifyApiKey, type ApiKeyStore } from "./verify-api-key";
import type { ServiceApiKey } from "@/types/webhooks";

const rawKey = "cv_test_abcdefghijklmnopqrstuvwx12345678";

describe("verifyApiKey", () => {
  it("returns service identity for active keys with the required scope", async () => {
    const updates: string[] = [];
    const store = createMemoryApiKeyStore(
      {
        id: "key-1",
        name: "AI worker",
        keyHash: hashApiKey(rawKey),
        keyPrefix: "cv_test_abcd...",
        serviceName: "ai-extractor",
        allowedSources: ["ai-extractor"],
        scopes: ["notifications:create", "tasks:update"],
        active: true,
        lastUsedAt: null,
        expiresAt: futureDate(),
        createdBy: null,
        createdAt: "2026-06-22T08:00:00.000Z",
        updatedAt: "2026-06-22T08:00:00.000Z",
      },
      updates
    );

    await expect(
      verifyApiKey(rawKey, "tasks:update", { store })
    ).resolves.toEqual({
      apiKeyId: "key-1",
      serviceName: "ai-extractor",
      allowedSources: ["ai-extractor"],
      scopes: ["notifications:create", "tasks:update"],
    });
    expect(updates).toEqual(["key-1"]);
  });

  it("rejects inactive, expired, or insufficiently scoped keys", async () => {
    await expect(
      verifyApiKey(rawKey, undefined, {
        store: createMemoryApiKeyStore({
          ...baseKey(),
          active: false,
        }),
      })
    ).rejects.toThrow("API key is inactive");

    await expect(
      verifyApiKey(rawKey, undefined, {
        store: createMemoryApiKeyStore({
          ...baseKey(),
          expiresAt: "2026-01-01T00:00:00.000Z",
        }),
      })
    ).rejects.toThrow("API key has expired");

    await expect(
      verifyApiKey(rawKey, "messages:create", {
        store: createMemoryApiKeyStore(baseKey()),
      })
    ).rejects.toThrow("API key is missing required scope");
  });
});

function baseKey(): ServiceApiKey {
  return {
    id: "key-1",
    name: "AI worker",
    keyHash: hashApiKey(rawKey),
    keyPrefix: "cv_test_abcd...",
    serviceName: "ai-extractor",
    allowedSources: ["ai-extractor"],
    scopes: ["notifications:create"],
    active: true,
    lastUsedAt: null,
    expiresAt: futureDate(),
    createdBy: null,
    createdAt: "2026-06-22T08:00:00.000Z",
    updatedAt: "2026-06-22T08:00:00.000Z",
  };
}

function createMemoryApiKeyStore(
  key: ServiceApiKey,
  updates: string[] = []
): ApiKeyStore {
  return {
    async findByHash(keyHash) {
      return key.keyHash === keyHash ? key : null;
    },
    async updateLastUsedAt(apiKeyId) {
      updates.push(apiKeyId);
    },
  };
}

function futureDate() {
  return "2999-01-01T00:00:00.000Z";
}
