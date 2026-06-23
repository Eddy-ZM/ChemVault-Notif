"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SendTestNotificationButton() {
  const [loading, setLoading] = useState(false);

  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  async function sendTestNotification() {
    setLoading(true);

    try {
      const response = await fetch("/api/notifications/test", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to send a test notification."
            : "Unable to send test notification."
        );
      }

      toast.success("Test notification sent.");
    } catch (sendError) {
      toast.error(
        sendError instanceof Error
          ? sendError.message
          : "Unable to send test notification."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={sendTestNotification}
      disabled={loading}
    >
      <Send data-icon="inline-start" />
      Send test notification
    </Button>
  );
}
