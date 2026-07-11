import { describe, expect, it } from "vitest";
import { parseChemVaultEvent } from "./contract";

const validEvent = {
  specVersion: "1.0",
  id: "event-1",
  type: "lab.analysis.completed",
  source: "chemvault-lab",
  subject: "analysis/result-1",
  time: "2026-07-10T12:00:00.000Z",
  user: { id: "user-1" },
  data: {
    title: "Analysis ready",
    summary: "The analysis is ready.",
    deepLink: "https://lab.chemvault.science/result/result-1",
    analysisId: "result-1",
  },
};

describe("ChemVault event contract", () => {
  it("accepts a valid Lab completion event", () => {
    expect(parseChemVaultEvent(validEvent).data.analysisId).toBe("result-1");
  });

  it("rejects deep links outside ChemVault", () => {
    expect(() => parseChemVaultEvent({ ...validEvent, data: { ...validEvent.data, deepLink: "https://example.com" } })).toThrow();
  });
});
