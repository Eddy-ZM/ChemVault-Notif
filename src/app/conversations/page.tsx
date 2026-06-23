"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConversationList } from "@/components/messages/ConversationList";
import { ProjectMessagePanel } from "@/components/messages/ProjectMessagePanel";
import { NotificationBell } from "@/components/notifications/NotificationBell";

export default function ConversationsPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [conversationListKey, setConversationListKey] = useState(0);

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessagesSquare className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-base font-semibold">ChemVault Messages</h1>
              <p className="text-xs text-muted-foreground">
                Project discussion and workflow activity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/">
                <ArrowLeft data-icon="inline-start" />
                Dashboard
              </Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[22rem_1fr] lg:px-8">
        <Card className="min-h-[28rem] overflow-hidden lg:h-[calc(100vh-7rem)]">
          <ConversationList
            key={conversationListKey}
            activeConversationId={selectedConversationId}
            onSelect={setSelectedConversationId}
            className="h-full"
          />
        </Card>
        <ProjectMessagePanel
          conversationId={selectedConversationId}
          onMessagesChanged={() => setConversationListKey((current) => current + 1)}
        />
      </div>
    </main>
  );
}
