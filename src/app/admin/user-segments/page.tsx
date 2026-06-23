import Link from "next/link";
import type { Route } from "next";
import { Megaphone, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserSegmentsAdminPanel } from "@/components/admin/UserSegmentsAdminPanel";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";

export const dynamic = "force-dynamic";

export default async function UserSegmentsPage() {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const segments = await createSupabaseBroadcastStore().listSegments();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <UsersRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                User segments
              </h1>
              <p className="text-sm text-muted-foreground">
                Admin-managed recipient groups for targeted notifications.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={"/admin/broadcasts" as Route}>
              <Megaphone data-icon="inline-start" />
              Broadcasts
            </Link>
          </Button>
        </div>

        <UserSegmentsAdminPanel initialSegments={segments} />
      </div>
    </main>
  );
}

function AdminAccessState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to manage user
              segments.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
