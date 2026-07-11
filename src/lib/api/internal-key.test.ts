import { describe, expect, it } from "vitest";
import { isValidLifecycleKeyValue } from "./internal-key";

describe("lifecycle internal key", () => {
  it("uses a dedicated exact secret", async () => {
    await expect(isValidLifecycleKeyValue("lifecycle-secret", "lifecycle-secret")).resolves.toBe(true);
    await expect(isValidLifecycleKeyValue("internal-api-key", "lifecycle-secret")).resolves.toBe(false);
  });
});
