"use client";

import { useState, type KeyboardEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Message } from "@/types/messages";

interface MessageInputProps {
  conversationId: string;
  onMessageCreated?: (message: Message) => void;
}

export function MessageInput({
  conversationId,
  onMessageCreated,
}: MessageInputProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trimmedBody = body.trim();

  async function sendMessage() {
    if (!trimmedBody || sending) {
      return;
    }

    setSending(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({ body: trimmedBody }),
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to send a message."
            : "Unable to send message."
        );
      }

      const data = (await response.json()) as { message: Message };
      setBody("");
      onMessageCreated?.(data.message);
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Unable to send message."
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void sendMessage();
  }

  return (
    <div className="flex flex-col gap-2 border-t bg-card p-3">
      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="flex items-end gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a project message..."
          className="max-h-36 min-h-20 resize-none"
          disabled={sending}
        />
        <Button
          type="button"
          size="icon"
          onClick={sendMessage}
          disabled={!trimmedBody || sending}
          aria-label="Send message"
        >
          {sending ? (
            <Loader2 className="animate-spin" aria-hidden="true" />
          ) : (
            <Send aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  );
}
