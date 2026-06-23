"use client";

export type PushPermissionState =
  | "unsupported"
  | NotificationPermission
  | "default";

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.serviceWorker) &&
    typeof window.PushManager !== "undefined" &&
    typeof window.Notification !== "undefined"
  );
}

export function getPushPermissionState(): PushPermissionState {
  if (!isPushSupported()) {
    return "unsupported";
  }

  return Notification.permission;
}

export function urlBase64ToUint8Array(
  base64String: string
): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!isPushSupported()) {
    throw new Error("System notifications are not supported in this browser.");
  }

  return navigator.serviceWorker.register("/sw.js");
}

export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error("System notifications are not supported in this browser.");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY.");
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    throw new Error(
      permission === "denied"
        ? "System notifications are blocked in this browser."
        : "System notification permission was not granted."
    );
  }

  const registration = await registerServiceWorker();
  const existingSubscription =
    await registration.pushManager.getSubscription();
  const subscription =
    existingSubscription ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  const response = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(subscription.toJSON()),
  });

  if (!response.ok) {
    throw new Error("Unable to save system notification subscription.");
  }

  return subscription;
}

export async function unsubscribeFromPush(): Promise<void> {
  let endpoint: string | undefined;

  if (isPushSupported()) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();

    if (subscription) {
      endpoint = subscription.endpoint;
      await subscription.unsubscribe();
    }
  }

  const response = await fetch("/api/push/unsubscribe", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    body: JSON.stringify(endpoint ? { endpoint } : {}),
  });

  if (!response.ok) {
    throw new Error("Unable to remove system notification subscription.");
  }
}
