import Link from "next/link";
import { notFound } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectMessagePanel } from "@/components/messages/ProjectMessagePanel";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { createSupabaseMessageStore } from "@/lib/messages/message-store";

export const dynamic = "force-dynamic";

export default async function ConversationDetailsPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { user } = await getAuthenticatedSupabase();

  if (!user) {
    return <SignedOutState />;
  }

  const store = createSupabaseMessageStore();
  const [conversation, isMember] = await Promise.all([
    store.getConversation(conversationId),
    store.isConversationMember(conversationId, user.id),
  ]);

  if (!conversation || !isMember) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessagesSquare className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                {conversation.title ?? "Project conversation"}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {conversation.projectId
                  ? `Project ${conversation.projectId}`
                  : "ChemVault workspace conversation"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href={"/conversations" as Route}>
                <ArrowLeft data-icon="inline-start" />
                Inbox
              </Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <ProjectMessagePanel
          conversationId={conversation.id}
          projectId={conversation.projectId}
          title={conversation.title}
        />
      </div>
    </main>
  );
}

function SignedOutState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need an authenticated ChemVault session to view project
              messages.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
