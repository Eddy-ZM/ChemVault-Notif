import Link from "next/link";
import type { Route } from "next";
import { Megaphone, Plus, RadioTower, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";
import type { Broadcast } from "@/types/broadcasts";

export const dynamic = "force-dynamic";

export default async function AdminBroadcastsPage() {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const broadcasts = await createSupabaseBroadcastStore().listBroadcasts();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Megaphone className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Admin broadcasts
              </h1>
              <p className="text-sm text-muted-foreground">
                Audited notification campaigns for ChemVault workspaces.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={"/admin/user-segments" as Route}>
                <UsersRound data-icon="inline-start" />
                Segments
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={"/admin/webhook-events" as Route}>
                <RadioTower data-icon="inline-start" />
                Webhooks
              </Link>
            </Button>
            <Button asChild>
              <Link href={"/admin/broadcasts/new" as Route}>
                <Plus data-icon="inline-start" />
                New broadcast
              </Link>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Broadcast history</CardTitle>
            <CardDescription>{broadcasts.length} broadcasts loaded</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {broadcasts.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No broadcasts have been created.
              </p>
            ) : (
              broadcasts.map((broadcast) => (
                <BroadcastRow key={broadcast.id} broadcast={broadcast} />
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function BroadcastRow({ broadcast }: { broadcast: Broadcast }) {
  return (
    <Link
      href={`/admin/broadcasts/${broadcast.id}` as Route}
      className="rounded-md border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{broadcast.title}</p>
            <Badge variant={statusVariant(broadcast.status)}>
              {broadcast.status}
            </Badge>
            <Badge variant="outline">{broadcast.targetType}</Badge>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {broadcast.body}
          </p>
        </div>
        <div className="shrink-0 text-sm text-muted-foreground md:text-right">
          <p>{broadcast.recipientCount} recipients</p>
          <p>{formatDate(broadcast.sentAt ?? broadcast.createdAt)}</p>
        </div>
      </div>
      <Separator className="my-3" />
      <p className="text-xs text-muted-foreground">
        {broadcast.source} · {broadcast.link ?? "/notifications"}
      </p>
    </Link>
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
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to manage
              broadcasts.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

function statusVariant(status: Broadcast["status"]) {
  return status === "failed"
    ? "destructive"
    : status === "sent"
      ? "default"
      : "secondary";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
