"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BroadcastSendButtonProps {
  broadcastId: string;
  disabled?: boolean;
}

export function BroadcastSendButton({
  broadcastId,
  disabled,
}: BroadcastSendButtonProps) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendBroadcast() {
    setSending(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/broadcasts/${broadcastId}/send`, {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      router.refresh();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Unable to send broadcast."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        disabled={disabled || sending}
        onClick={sendBroadcast}
      >
        {sending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Send data-icon="inline-start" />
        )}
        Send broadcast
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; detail?: string };
    return data.error ?? data.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
