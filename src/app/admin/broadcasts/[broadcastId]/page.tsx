import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
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
import { BroadcastDraftEditor } from "@/components/admin/BroadcastDraftEditor";
import { BroadcastSendButton } from "@/components/admin/BroadcastSendButton";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";
import type { Broadcast } from "@/types/broadcasts";

export const dynamic = "force-dynamic";

export default async function BroadcastDetailsPage({
  params,
}: {
  params: Promise<{ broadcastId: string }>;
}) {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const { broadcastId } = await params;
  const store = createSupabaseBroadcastStore();
  const [broadcast, recipients, auditLogs] = await Promise.all([
    store.getBroadcast(broadcastId),
    store.listBroadcastRecipients(broadcastId),
    store.listBroadcastAuditLogs(broadcastId),
  ]);

  if (!broadcast) {
    notFound();
  }

  const sentCount = recipients.filter((item) => item.status === "sent").length;
  const failedCount = recipients.filter((item) => item.status === "failed").length;
  const canSend = broadcast.status === "draft" || broadcast.status === "scheduled";

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Megaphone className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Broadcast detail
              </h1>
              <p className="text-sm text-muted-foreground">{broadcast.id}</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={"/admin/broadcasts" as Route}>
              <ArrowLeft data-icon="inline-start" />
              Broadcasts
            </Link>
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{broadcast.title}</CardTitle>
                <Badge variant={statusVariant(broadcast.status)}>
                  {broadcast.status}
                </Badge>
                <Badge variant="outline">{broadcast.targetType}</Badge>
              </div>
              <CardDescription>{broadcast.body}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Meta label="Type" value={broadcast.type} />
              <Meta label="Source" value={broadcast.source} />
              <Meta label="Link" value={broadcast.link ?? "/notifications"} />
              <Meta label="Created" value={formatDate(broadcast.createdAt)} />
              <Meta label="Sent" value={formatDate(broadcast.sentAt)} />
              <Meta
                label="Push preview"
                value={
                  broadcast.targetPayload.pushPreviewAllowed === true
                    ? "allowed"
                    : "generic only"
                }
              />
            </CardContent>
          </Card>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Delivery</CardTitle>
              <CardDescription>
                {broadcast.recipientCount} resolved recipients
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Stat label="Sent" value={sentCount} />
              <Stat label="Failed" value={failedCount} />
              <Stat
                label="Pending"
                value={recipients.length - sentCount - failedCount}
              />
              <Separator />
              <BroadcastSendButton
                broadcastId={broadcast.id}
                disabled={!canSend}
              />
              {!canSend ? (
                <p className="text-xs text-muted-foreground">
                  Sent and failed broadcasts are locked from editing and resend.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {canSend ? <BroadcastDraftEditor initialBroadcast={broadcast} /> : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Target payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-72 overflow-auto rounded-md bg-muted p-4 text-xs leading-5 text-muted-foreground">
              {JSON.stringify(broadcast.targetPayload, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recipients</CardTitle>
            <CardDescription>{recipients.length} recipient rows</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {recipients.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No recipients have been materialized yet.
              </p>
            ) : (
              recipients.map((recipient) => (
                <div
                  key={recipient.id}
                  className="grid gap-3 rounded-md border bg-card p-3 text-sm md:grid-cols-[1fr_auto_auto]"
                >
                  <code className="break-all text-xs">{recipient.userId}</code>
                  <Badge
                    variant={
                      recipient.status === "failed" ? "destructive" : "secondary"
                    }
                  >
                    {recipient.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(recipient.sentAt)}
                  </span>
                  {recipient.errorMessage ? (
                    <p className="md:col-span-3 text-sm text-destructive">
                      {recipient.errorMessage}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit log</CardTitle>
            <CardDescription>{auditLogs.length} entries</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {auditLogs.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No audit entries recorded.
              </p>
            ) : (
              auditLogs.map((log) => (
                <div key={log.id} className="rounded-md border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                  <pre className="mt-3 max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
                    {JSON.stringify(log.metadata, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
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
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to inspect
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

function formatDate(value: string | null) {
  if (!value) {
    return "never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
