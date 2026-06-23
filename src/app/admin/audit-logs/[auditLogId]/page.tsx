import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, FileSearch } from "lucide-react";
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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toAuditLog } from "@/lib/audit/transform";
import type { AuditLog } from "@/types/audit";

export const dynamic = "force-dynamic";

export default async function AuditLogDetailPage({
  params,
}: {
  params: Promise<{ auditLogId: string }>;
}) {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const { auditLogId } = await params;
  const auditLog = await loadAuditLog(auditLogId);

  if (!auditLog) {
    return <NotFoundState />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <Button variant="outline" asChild>
            <Link href={"/admin/audit-logs" as Route}>
              <ArrowLeft data-icon="inline-start" />
              Audit logs
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <FileSearch className="size-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-xl">{auditLog.title}</CardTitle>
                <CardDescription>{auditLog.action}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={
                  auditLog.severity === "error" ||
                  auditLog.severity === "critical"
                    ? "destructive"
                    : "secondary"
                }
              >
                {auditLog.severity}
              </Badge>
              <Badge variant="outline">{auditLog.actorType}</Badge>
              <Badge variant="outline">{auditLog.visibility}</Badge>
            </div>

            {auditLog.description ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {auditLog.description}
              </p>
            ) : null}

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <Meta label="Actor user" value={auditLog.actorUserId} />
              <Meta label="Entity" value={`${auditLog.entityType}:${auditLog.entityId ?? "none"}`} />
              <Meta label="Project" value={auditLog.projectId} />
              <Meta label="Target user" value={auditLog.userId} />
              <Meta label="Source" value={auditLog.source} />
              <Meta label="Created" value={formatDate(auditLog.createdAt)} />
              <Meta label="IP address" value={auditLog.ipAddress} />
              <Meta label="User agent" value={auditLog.userAgent} />
            </div>

            <div>
              <p className="text-sm font-medium">Metadata</p>
              <pre className="mt-2 max-h-[28rem] overflow-auto rounded-md border bg-muted p-4 text-xs leading-5">
                {JSON.stringify(auditLog.metadata, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function loadAuditLog(auditLogId: string): Promise<AuditLog | null> {
  const { data, error } = await createSupabaseAdminClient()
    .from("audit_logs")
    .select("*")
    .eq("id", auditLogId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? toAuditLog(data) : null;
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-sm">{value ?? "none"}</p>
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
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to inspect audit logs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

function NotFoundState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Audit log not found</CardTitle>
            <CardDescription>
              The requested audit event does not exist or is no longer available.
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
