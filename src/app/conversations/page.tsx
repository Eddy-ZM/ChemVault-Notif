"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { ConversationList } from "@/components/messages/ConversationList";
import { ProjectMessagePanel } from "@/components/messages/ProjectMessagePanel";

export default function ConversationsPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [conversationListKey, setConversationListKey] = useState(0);

  return (
    <main className="bg-background">
      <div className="marketing-container grid gap-4 py-6 lg:grid-cols-[22rem_1fr]">
        <Card className="min-h-[28rem] overflow-hidden lg:h-[calc(100vh-10rem)]">
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
