import { notFound } from "next/navigation";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectMessagePanel } from "@/components/messages/ProjectMessagePanel";
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
    <main className="bg-background">
      <div className="marketing-container max-w-6xl py-6">
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
