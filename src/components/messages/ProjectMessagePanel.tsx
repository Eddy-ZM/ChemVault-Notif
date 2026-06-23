"use client";

import { useCallback, useState } from "react";
import { useEffect } from "react";
import { MessagesSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MessageInput } from "./MessageInput";
import { MessageThread } from "./MessageThread";
import type { Conversation } from "@/types/messages";

interface ProjectMessagePanelProps {
  conversationId?: string | null;
  projectId?: string | null;
  title?: string | null;
  onMessagesChanged?: () => void;
}

export function ProjectMessagePanel({
  conversationId,
  projectId,
  title,
  onMessagesChanged,
}: ProjectMessagePanelProps) {
  const [refreshToken, setRefreshToken] = useState(0);
  const [resolvedConversation, setResolvedConversation] = useState<{
    projectId: string;
    conversation: Conversation;
  } | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const handleMessagesChanged = useCallback(() => {
    onMessagesChanged?.();
  }, [onMessagesChanged]);
  const activeConversation =
    conversationId ??
    (projectId && resolvedConversation?.projectId === projectId
      ? resolvedConversation.conversation.id
      : null);
  const activeTitle =
    title ??
    (projectId && resolvedConversation?.projectId === projectId
      ? resolvedConversation.conversation.title
      : null);

  useEffect(() => {
    if (conversationId || !projectId) {
      return;
    }

    let cancelled = false;
    const projectIdForRequest = projectId;

    async function resolveProjectConversation() {
      try {
        const response = await fetch(
          `/api/projects/${projectIdForRequest}/conversation`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "same-origin",
            body: JSON.stringify({
              title: title ?? "AI Paper Extraction Project",
            }),
          }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to open project messages."
              : "Unable to open project conversation."
          );
        }

        const data = (await response.json()) as { conversation: Conversation };

        if (!cancelled) {
          setResolvedConversation({
            projectId: projectIdForRequest,
            conversation: data.conversation,
          });
          setResolveError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setResolveError(
            error instanceof Error
              ? error.message
              : "Unable to open project conversation."
          );
        }
      }
    }

    void resolveProjectConversation();

    return () => {
      cancelled = true;
    };
  }, [conversationId, projectId, title]);

  if (!activeConversation) {
    return (
      <Card className="flex min-h-[34rem] flex-col">
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <MessagesSquare className="size-10 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm font-medium">
            {projectId ? "Opening project conversation" : "Select a conversation"}
          </p>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            {resolveError ??
              "Choose a project conversation to review discussion and workflow updates."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex min-h-[34rem] overflow-hidden lg:min-h-[42rem]">
      <div className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="border-b p-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessagesSquare className="size-4" aria-hidden="true" />
            {activeTitle ?? "Project conversation"}
          </CardTitle>
          {projectId ? (
            <p className="text-xs text-muted-foreground">Project {projectId}</p>
          ) : null}
        </CardHeader>
        <MessageThread
          key={`${activeConversation}:${refreshToken}`}
          conversationId={activeConversation}
          onMessagesChanged={handleMessagesChanged}
        />
        <MessageInput
          conversationId={activeConversation}
          onMessageCreated={() => {
            setRefreshToken((current) => current + 1);
            handleMessagesChanged();
          }}
        />
      </div>
    </Card>
  );
}
