import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getPushPermissionState,
  isPushSupported,
  urlBase64ToUint8Array,
} from "./push-client";

const originalNotification = globalThis.Notification;
const originalPushManager = globalThis.PushManager;

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    writable: true,
    value: originalNotification,
  });
  Object.defineProperty(globalThis, "PushManager", {
    configurable: true,
    writable: true,
    value: originalPushManager,
  });
});

describe("urlBase64ToUint8Array", () => {
  it("converts a URL-safe VAPID key to bytes", () => {
    const result = urlBase64ToUint8Array("SGVsbG8td29ybGQ");

    expect(Array.from(result)).toEqual(
      Array.from(new TextEncoder().encode("Hello-world"))
    );
  });
});

describe("isPushSupported", () => {
  it("returns false when service workers are unavailable", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
    vi.stubGlobal("PushManager", class PushManager {});
    vi.stubGlobal("Notification", class Notification {});

    expect(isPushSupported()).toBe(false);
  });

  it("returns true when service workers, PushManager, and Notification exist", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });
    vi.stubGlobal("PushManager", class PushManager {});
    vi.stubGlobal("Notification", class Notification {});

    expect(isPushSupported()).toBe(true);
  });
});

describe("getPushPermissionState", () => {
  it("returns unsupported without browser push APIs", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });

    expect(getPushPermissionState()).toBe("unsupported");
  });

  it("returns the current notification permission when supported", () => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });
    vi.stubGlobal("PushManager", class PushManager {});
    vi.stubGlobal("Notification", {
      permission: "denied",
    });

    expect(getPushPermissionState()).toBe("denied");
  });
});
