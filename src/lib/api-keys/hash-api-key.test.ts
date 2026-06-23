import { describe, expect, it } from "vitest";
import {
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
} from "./hash-api-key";

describe("API key hashing", () => {
  it("generates live and test keys with display prefixes", () => {
    const liveKey = generateApiKey({ mode: "live" });
    const testKey = generateApiKey({ mode: "test" });

    expect(liveKey).toMatch(/^cv_live_[A-Za-z0-9_-]{32,}$/);
    expect(testKey).toMatch(/^cv_test_[A-Za-z0-9_-]{32,}$/);
    expect(getApiKeyPrefix(liveKey)).toMatch(/^cv_live_[A-Za-z0-9_-]{4}\.\.\.$/);
    expect(getApiKeyPrefix(testKey)).toMatch(/^cv_test_[A-Za-z0-9_-]{4}\.\.\.$/);
  });

  it("hashes keys without returning the raw key", () => {
    const rawKey = "cv_test_abcdefghijklmnopqrstuvwx12345678";
    const hash = hashApiKey(rawKey);

    expect(hash).toHaveLength(64);
    expect(hash).not.toContain(rawKey);
    expect(hash).toBe(hashApiKey(rawKey));
  });
});
