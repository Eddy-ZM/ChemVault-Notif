import { describe, expect, it } from "vitest";
import { parsePushSubscriptionBody } from "./push-subscriptions";

describe("parsePushSubscriptionBody", () => {
  it("extracts endpoint and encryption keys from PushSubscription JSON", () => {
    expect(
      parsePushSubscriptionBody({
        endpoint: "https://push.example.test/subscription",
        keys: {
          p256dh: "public-key",
          auth: "auth-secret",
        },
      })
    ).toEqual({
      endpoint: "https://push.example.test/subscription",
      p256dh: "public-key",
      auth: "auth-secret",
    });
  });

  it("rejects missing endpoint or keys", () => {
    expect(() => parsePushSubscriptionBody({})).toThrow(
      "Push subscription endpoint is required."
    );
    expect(() =>
      parsePushSubscriptionBody({
        endpoint: "https://push.example.test/subscription",
        keys: {
          p256dh: "",
          auth: "auth-secret",
        },
      })
    ).toThrow("Push subscription p256dh key is required.");
  });
});
