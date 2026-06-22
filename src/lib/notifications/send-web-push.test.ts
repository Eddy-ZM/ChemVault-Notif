import { describe, expect, it } from "vitest";
import { buildWebPushPayload, isInvalidPushSubscriptionError } from "./send-web-push";

describe("buildWebPushPayload", () => {
  it("uses privacy-preserving fallback content by default", () => {
    expect(
      buildWebPushPayload({
        title: "Extraction completed",
        body: "Your document has been converted into structured scientific data.",
        link: "/projects/project-1/results",
        notificationId: "notification-1",
      })
    ).toEqual({
      title: "ChemVault",
      body: "You have a new notification.",
      link: "/notifications",
      notificationId: "notification-1",
    });
  });

  it("includes actual notification preview only when explicitly allowed", () => {
    expect(
      buildWebPushPayload({
        title: "Extraction completed",
        body: "Your document has been converted into structured scientific data.",
        link: "/projects/project-1/results",
        notificationId: "notification-1",
        previewAllowed: true,
      })
    ).toEqual({
      title: "Extraction completed",
      body: "Your document has been converted into structured scientific data.",
      link: "/projects/project-1/results",
      notificationId: "notification-1",
    });
  });
});

describe("isInvalidPushSubscriptionError", () => {
  it("treats expired or gone subscriptions as invalid", () => {
    expect(isInvalidPushSubscriptionError({ statusCode: 404 })).toBe(true);
    expect(isInvalidPushSubscriptionError({ statusCode: 410 })).toBe(true);
  });

  it("does not treat transient push errors as invalid subscriptions", () => {
    expect(isInvalidPushSubscriptionError({ statusCode: 503 })).toBe(false);
    expect(isInvalidPushSubscriptionError(new Error("network"))).toBe(false);
  });
});
