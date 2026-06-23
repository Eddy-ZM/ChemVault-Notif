"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { Database, MessageRow } from "@/lib/supabase/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { toMessage } from "@/lib/messages/transform";
import { cn } from "@/lib/utils";
import type { Message } from "@/types/messages";
import { MessageBubble } from "./MessageBubble";

interface MessageThreadProps {
  conversationId: string;
  onMessagesChanged?: () => void;
  className?: string;
}

export function MessageThread({
  conversationId,
  onMessagesChanged,
  className,
}: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createSupabaseBrowserClient();
    return supabaseRef.current;
  }, []);

  const markRead = useCallback(async () => {
    await fetch(`/api/conversations/${conversationId}/read`, {
      method: "POST",
      credentials: "same-origin",
    });
  }, [conversationId]);

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/conversations/${conversationId}/messages`,
        {
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to view messages."
            : "Unable to load messages."
        );
      }

      const data = (await response.json()) as { messages: Message[] };
      setMessages(data.messages);
      setError(null);
      await markRead();
      onMessagesChanged?.();
    } catch (fetchError) {
      setError(
        fetchError instanceof Error ? fetchError.message : "Unable to load messages."
      );
    } finally {
      setLoading(false);
    }
  }, [conversationId, markRead, onMessagesChanged]);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      await loadMessages();

      try {
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!cancelled) {
          setCurrentUserId(user?.id ?? null);
        }

        if (cancelled || !user) {
          return;
        }

        const channel = supabase
          .channel(`messages:${conversationId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
              filter: `conversation_id=eq.${conversationId}`,
            },
            (payload) => {
              const message = toMessage(payload.new as MessageRow);
              setMessages((current) =>
                current.some((item) => item.id === message.id)
                  ? current
                  : [...current, message]
              );
              void markRead();
              onMessagesChanged?.();
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch {
        if (!cancelled) {
          setError("Realtime is unavailable. Check Supabase public env vars.");
        }
      }
    }

    void subscribe();

    return () => {
      cancelled = true;
      if (channelRef.current && supabaseRef.current) {
        supabaseRef.current.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, getSupabase, loadMessages, markRead, onMessagesChanged]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  return (
    <ScrollArea className={cn("min-h-0 flex-1", className)}>
      <div className="flex min-h-full flex-col gap-3 p-4">
        {loading ? (
          <>
            <MessageSkeleton />
            <MessageSkeleton compact />
            <MessageSkeleton />
          </>
        ) : error ? (
          <StateMessage title="Unable to load messages" description={error} />
        ) : messages.length === 0 ? (
          <StateMessage
            title="No messages yet"
            description="Project discussion, AI task updates, and system workflow events will appear here."
          />
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              isOwn={message.senderId === currentUserId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}

function MessageSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex gap-3", compact && "justify-end")}>
      {!compact ? <Skeleton className="size-8 rounded-full" /> : null}
      <div className="w-full max-w-md rounded-md border bg-card p-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-3 w-full" />
        <Skeleton className="mt-2 h-3 w-2/3" />
      </div>
    </div>
  );
}

function StateMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <MessageSquare className="size-9 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
