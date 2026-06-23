import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserSegmentDetailPanel } from "@/components/admin/UserSegmentDetailPanel";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";

export const dynamic = "force-dynamic";

export default async function UserSegmentDetailsPage({
  params,
}: {
  params: Promise<{ segmentId: string }>;
}) {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const { segmentId } = await params;
  const store = createSupabaseBroadcastStore();
  const [segment, members] = await Promise.all([
    store.getSegment(segmentId),
    store.listSegmentMembers(segmentId),
  ]);

  if (!segment) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <UsersRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                {segment.name}
              </h1>
              <p className="text-sm text-muted-foreground">{segment.id}</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={"/admin/user-segments" as Route}>
              <ArrowLeft data-icon="inline-start" />
              Segments
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Segment metadata</CardTitle>
              <Badge variant="secondary">{segment.type}</Badge>
            </div>
            <CardDescription>
              {segment.description || "No description"}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Meta label="Created" value={formatDate(segment.createdAt)} />
            <Meta label="Updated" value={formatDate(segment.updatedAt)} />
            <Meta label="Members" value={`${members.length}`} />
            <Meta label="Created by" value={segment.createdBy ?? "unknown"} />
          </CardContent>
        </Card>

        <UserSegmentDetailPanel
          segmentId={segment.id}
          initialMembers={members}
        />
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
              segment.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
