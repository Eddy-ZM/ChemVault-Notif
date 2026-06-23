"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, RefreshCw } from "lucide-react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/components/notifications/time";
import type { Database } from "@/lib/supabase/database.types";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/types/messages";

interface ConversationListProps {
  activeConversationId?: string | null;
  onSelect?: (conversationId: string) => void;
  className?: string;
}

export function ConversationList({
  activeConversationId,
  onSelect,
  className,
}: ConversationListProps) {
  const supabaseRef = useRef<SupabaseClient<Database> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getSupabase = useCallback(() => {
    supabaseRef.current ??= createSupabaseBrowserClient();
    return supabaseRef.current;
  }, []);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/conversations", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Sign in to view project messages."
            : "Unable to load conversations."
        );
      }

      const data = (await response.json()) as {
        conversations: ConversationSummary[];
      };
      setConversations(data.conversations);
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load conversations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function subscribe() {
      await refresh();

      try {
        const supabase = getSupabase();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (cancelled || !user) {
          return;
        }

        const channel = supabase
          .channel(`conversation-list:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "messages",
            },
            () => {
              void refresh();
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
  }, [getSupabase, refresh]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <div>
          <p className="text-sm font-semibold">Project messages</p>
          <p className="text-xs text-muted-foreground">
            Workspace discussions and workflow updates
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            setLoading(true);
            void refresh();
          }}
          aria-label="Refresh conversations"
        >
          <RefreshCw aria-hidden="true" />
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        {loading ? (
          <div className="flex flex-col gap-2 p-3">
            <ConversationSkeleton />
            <ConversationSkeleton />
            <ConversationSkeleton />
          </div>
        ) : error ? (
          <StateMessage title="Unable to load messages" description={error} />
        ) : conversations.length === 0 ? (
          <StateMessage
            title="No project conversations"
            description="Project discussions and AI workflow messages will appear here."
          />
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {conversations.map((summary) => (
              <button
                key={summary.conversation.id}
                type="button"
                onClick={() => onSelect?.(summary.conversation.id)}
                className={cn(
                  "flex w-full flex-col gap-2 rounded-md px-3 py-3 text-left transition-colors hover:bg-accent",
                  activeConversationId === summary.conversation.id && "bg-accent"
                )}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {summary.conversation.title ?? "Project conversation"}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {summary.latestMessage?.body ?? "No messages yet"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(summary.latestActivityAt)}
                    </span>
                    {summary.unreadCount > 0 ? (
                      <Badge>{summary.unreadCount}</Badge>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function ConversationSkeleton() {
  return (
    <div className="rounded-md border bg-card p-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-8" />
      </div>
      <Skeleton className="mt-3 h-3 w-full" />
      <Skeleton className="mt-2 h-3 w-2/3" />
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
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <MessageSquare className="size-9 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
