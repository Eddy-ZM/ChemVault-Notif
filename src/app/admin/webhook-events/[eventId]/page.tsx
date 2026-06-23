import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, RadioTower } from "lucide-react";
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
import { createSupabaseWebhookStore } from "@/lib/webhooks/webhook-store";

export const dynamic = "force-dynamic";

export default async function WebhookEventDetailsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const { eventId } = await params;
  const store = createSupabaseWebhookStore();
  const [event, logs] = await Promise.all([
    store.getEvent(eventId),
    store.listEventLogs(eventId),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <RadioTower className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Webhook event
              </h1>
              <p className="text-sm text-muted-foreground">{event.id}</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={"/admin/webhook-events" as Route}>
              <ArrowLeft data-icon="inline-start" />
              Events
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{event.eventType}</CardTitle>
              <Badge variant={event.status === "failed" ? "destructive" : "secondary"}>
                {event.status}
              </Badge>
            </div>
            <CardDescription>
              {event.serviceName} · {event.source}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Meta label="User" value={event.userId ?? "none"} />
            <Meta label="Project" value={event.projectId ?? "none"} />
            <Meta label="Task" value={event.taskId ?? "none"} />
            <Meta label="Conversation" value={event.conversationId ?? "none"} />
            <Meta label="Idempotency key" value={event.idempotencyKey ?? "none"} />
            <Meta label="Received" value={formatDate(event.receivedAt)} />
            <Meta label="Processed" value={formatDate(event.processedAt)} />
            <Meta label="Error" value={event.errorMessage ?? "none"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[28rem] overflow-auto rounded-md bg-muted p-4 text-xs leading-5 text-muted-foreground">
              {JSON.stringify(event.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Logs</CardTitle>
            <CardDescription>{logs.length} log entries</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {logs.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No logs recorded.
              </p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="rounded-md border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.level === "error" ? "destructive" : "secondary"}>
                        {log.level}
                      </Badge>
                      <p className="text-sm font-medium">{log.message}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(log.createdAt)}
                    </p>
                  </div>
                  <Separator className="my-3" />
                  <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
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

function AdminAccessState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
            <CardDescription>
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to inspect this
              event.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
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
