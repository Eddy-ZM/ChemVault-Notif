import { describe, expect, it } from "vitest";
import { parseNotificationQuery } from "./filters";

describe("parseNotificationQuery", () => {
  it("uses defaults for an empty query", () => {
    const result = parseNotificationQuery(new URLSearchParams());

    expect(result).toEqual({
      limit: 30,
      read: "all",
      source: null,
      type: null,
    });
  });

  it("clamps limit and parses unreadOnly for backward-compatible clients", () => {
    const params = new URLSearchParams({
      limit: "500",
      unreadOnly: "true",
      source: "ai-extractor",
      type: "success",
    });

    expect(parseNotificationQuery(params)).toEqual({
      limit: 100,
      read: "unread",
      source: "ai-extractor",
      type: "success",
    });
  });

  it("supports explicit read filters and ignores unsafe source values", () => {
    const params = new URLSearchParams({
      read: "read",
      source: "admin\nbad",
      type: "not-real",
    });

    expect(parseNotificationQuery(params)).toEqual({
      limit: 30,
      read: "read",
      source: null,
      type: null,
    });
  });
});
