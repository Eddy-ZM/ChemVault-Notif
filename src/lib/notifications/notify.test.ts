import { describe, expect, it } from "vitest";
import { validateNotificationPayload } from "./notify";

describe("validateNotificationPayload", () => {
  it("requires a user id and title", () => {
    expect(() =>
      validateNotificationPayload({
        userId: "",
        title: "Ready",
      })
    ).toThrow("userId is required");

    expect(() =>
      validateNotificationPayload({
        userId: "7ec7ffef-31b0-4e4d-b226-a8f7355f1f28",
        title: " ",
      })
    ).toThrow("title is required");
  });

  it("defaults optional values and trims string input", () => {
    expect(
      validateNotificationPayload({
        userId: " 7ec7ffef-31b0-4e4d-b226-a8f7355f1f28 ",
        title: " Extraction completed ",
      })
    ).toEqual({
      userId: "7ec7ffef-31b0-4e4d-b226-a8f7355f1f28",
      title: "Extraction completed",
      body: null,
      type: "info",
      source: null,
      link: null,
      metadata: {},
    });
  });

  it("rejects unsupported notification types", () => {
    expect(() =>
      validateNotificationPayload({
        userId: "7ec7ffef-31b0-4e4d-b226-a8f7355f1f28",
        title: "Done",
        type: "billing",
      })
    ).toThrow("Unsupported notification type");
  });
});
