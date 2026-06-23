import Link from "next/link";
import type { Route } from "next";
import { Activity, ArrowLeft, Files, MessagesSquare } from "lucide-react";
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
import { getOrCreateProjectConversation } from "@/lib/messages/get-or-create-project-conversation";

export const dynamic = "force-dynamic";

export default async function ProjectMessagesPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user } = await getAuthenticatedSupabase();

  if (!user) {
    return <SignedOutState />;
  }

  const conversation = await getOrCreateProjectConversation({
    projectId,
    userId: user.id,
    title: "AI Paper Extraction Project",
  });

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
                Project {projectId}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <a href={`/projects/${projectId}/tasks`}>
                <ArrowLeft data-icon="inline-start" />
                Tasks
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/activity` as Route}>
                <Activity data-icon="inline-start" />
                Activity
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/files` as Route}>
                <Files data-icon="inline-start" />
                Files
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={"/conversations" as Route}>Inbox</Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
        <ProjectMessagePanel
          conversationId={conversation.id}
          projectId={projectId}
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
              You need an authenticated ChemVault session to open project
              messages.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
