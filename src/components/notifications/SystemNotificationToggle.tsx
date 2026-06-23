"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPushPermissionState,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  type PushPermissionState,
} from "@/lib/notifications/push-client";

type ToggleStatus =
  | "checking"
  | "unsupported"
  | "not-configured"
  | "default"
  | "enabled"
  | "blocked";

export function SystemNotificationToggle() {
  const [status, setStatus] = useState<ToggleStatus>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    resolveStatus().then((nextStatus) => {
      if (!cancelled) {
        setStatus(nextStatus);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setError(null);

    try {
      await subscribeToPush();
      setStatus("enabled");
      toast.success("System notifications enabled.");
    } catch (enableError) {
      const message =
        enableError instanceof Error
          ? enableError.message
          : "Unable to enable system notifications.";
      setError(message);
      setStatus(await resolveStatus());
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);

    try {
      await unsubscribeFromPush();
      setStatus(getStatusFromPermission(getPushPermissionState(), false));
      toast.success("System notifications disabled.");
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Unable to disable system notifications."
      );
    } finally {
      setBusy(false);
    }
  }

  const content = getStatusContent(status);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              {status === "enabled" ? (
                <BellRing className="size-4" aria-hidden="true" />
              ) : (
                <BellOff className="size-4" aria-hidden="true" />
              )}
              System notifications
            </CardTitle>
            <CardDescription>
              You will still receive in-app notifications without browser system
              notifications.
            </CardDescription>
          </div>
          <Badge variant={status === "enabled" ? "default" : "secondary"}>
            {content.badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{content.message}</p>
        {error ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {status === "enabled" ? (
            <Button
              type="button"
              variant="outline"
              onClick={disable}
              disabled={busy}
            >
              {busy ? <Loader2 data-icon="inline-start" /> : null}
              Disable notifications
            </Button>
          ) : (
            <Button
              type="button"
              onClick={enable}
              disabled={
                busy ||
                status === "unsupported" ||
                status === "blocked" ||
                status === "not-configured" ||
                status === "checking"
              }
            >
              {busy ? <Loader2 data-icon="inline-start" /> : null}
              Enable system notifications
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

async function resolveStatus(): Promise<ToggleStatus> {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return "not-configured";
  }

  const permission = getPushPermissionState();
  if (permission === "unsupported") {
    return "unsupported";
  }

  if (permission === "denied") {
    return "blocked";
  }

  if (permission !== "granted") {
    return "default";
  }

  if (!isPushSupported()) {
    return "unsupported";
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return getStatusFromPermission(permission, Boolean(subscription));
}

function getStatusFromPermission(
  permission: PushPermissionState,
  hasSubscription: boolean
): ToggleStatus {
  if (permission === "unsupported") {
    return "unsupported";
  }

  if (permission === "denied") {
    return "blocked";
  }

  if (permission === "granted" && hasSubscription) {
    return "enabled";
  }

  return "default";
}

function getStatusContent(status: ToggleStatus) {
  switch (status) {
    case "checking":
      return {
        badge: "Checking",
        message: "Checking browser system notification support.",
      };
    case "unsupported":
      return {
        badge: "Unsupported",
        message: "System notifications are not supported in this browser.",
      };
    case "not-configured":
      return {
        badge: "Not configured",
        message:
          "System notifications are not configured. Add a VAPID public key to enable this feature.",
      };
    case "enabled":
      return {
        badge: "Enabled",
        message: "System notifications are enabled.",
      };
    case "blocked":
      return {
        badge: "Blocked",
        message:
          "System notifications are blocked. Update your browser or site settings to allow them.",
      };
    case "default":
    default:
      return {
        badge: "Available",
        message: "Enable system notifications to receive important ChemVault updates.",
      };
  }
}
