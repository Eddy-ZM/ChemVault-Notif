import Link from "next/link";
import type { Route } from "next";
import { KeyRound, RadioTower } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseWebhookStore } from "@/lib/webhooks/webhook-store";
import type { WebhookEvent } from "@/types/webhooks";

export const dynamic = "force-dynamic";

export default async function WebhookEventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const params = await searchParams;
  const filters = {
    serviceName: singleParam(params.serviceName),
    eventType: singleParam(params.eventType),
    status: singleParam(params.status),
  };
  const events = await createSupabaseWebhookStore().listEvents(filters);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <RadioTower className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Webhook events
              </h1>
              <p className="text-sm text-muted-foreground">
                Recent trusted service submissions and processing state.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={"/admin/api-keys" as Route}>
              <KeyRound data-icon="inline-start" />
              API keys
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4">
              <Input
                name="serviceName"
                placeholder="service_name"
                defaultValue={filters.serviceName ?? ""}
              />
              <Input
                name="eventType"
                placeholder="event_type"
                defaultValue={filters.eventType ?? ""}
              />
              <Input
                name="status"
                placeholder="status"
                defaultValue={filters.status ?? ""}
              />
              <Button type="submit">Apply filters</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent events</CardTitle>
            <CardDescription>{events.length} events loaded</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {events.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No webhook events match these filters.
              </p>
            ) : (
              events.map((event) => <EventRow key={event.id} event={event} />)
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function EventRow({ event }: { event: WebhookEvent }) {
  return (
    <Link
      href={`/admin/webhook-events/${event.id}` as Route}
      className="block rounded-md border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{event.eventType}</p>
            <Badge variant={event.status === "failed" ? "destructive" : "secondary"}>
              {event.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.serviceName} · {event.source}
          </p>
          {event.errorMessage ? (
            <p className="mt-2 text-sm text-destructive">{event.errorMessage}</p>
          ) : null}
        </div>
        <div className="shrink-0 text-sm text-muted-foreground md:text-right">
          <p>received {formatDate(event.receivedAt)}</p>
          <p>processed {formatDate(event.processedAt)}</p>
        </div>
      </div>
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
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to inspect
              webhook events.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
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
