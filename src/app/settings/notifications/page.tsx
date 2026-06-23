import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, BellRing, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotificationPreferencesPanel } from "@/components/notifications/NotificationPreferencesPanel";
import { SystemNotificationToggle } from "@/components/notifications/SystemNotificationToggle";
import { getAuthenticatedSupabase } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const { user } = await getAuthenticatedSupabase();

  if (!user) {
    return <SignedOutState />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessageSquareText className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Notification preferences
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage how ChemVault reaches you for each notification
                category.
              </p>
            </div>
          </div>

          <Button variant="outline" asChild>
            <Link href={"/notifications" as Route}>
              <ArrowLeft data-icon="inline-start" />
              Back to notifications
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="size-4" aria-hidden="true" />
              In-app and system notification behavior
            </CardTitle>
            <CardDescription>
              In-app notifications are always shown in the ChemVault notification
              center. System notifications depend on browser push permission and
              your Web Push toggle settings.
            </CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
          <NotificationPreferencesPanel />
          <SystemNotificationToggle />
        </div>
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
              You need to sign in to manage notification preferences.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

