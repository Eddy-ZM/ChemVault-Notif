import Link from "next/link";
import type { Route } from "next";
import { FileSearch, RadioTower } from "lucide-react";
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
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toAuditLog } from "@/lib/audit/transform";
import type { AuditLog } from "@/types/audit";

export const dynamic = "force-dynamic";

export default async function AuditLogsPage({
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
  const filters = filterValues(params);
  const { auditLogs, nextCursor } = await loadAuditLogs(filters);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FileSearch className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Audit logs
              </h1>
              <p className="text-sm text-muted-foreground">
                Structured platform events across services, projects, and admin actions.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={"/admin/webhook-events" as Route}>
              <RadioTower data-icon="inline-start" />
              Webhook events
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-4 xl:grid-cols-8">
              <Input name="action" placeholder="action" defaultValue={filters.action ?? ""} />
              <Input
                name="actorType"
                placeholder="actor_type"
                defaultValue={filters.actorType ?? ""}
              />
              <Input
                name="entityType"
                placeholder="entity_type"
                defaultValue={filters.entityType ?? ""}
              />
              <Input name="source" placeholder="source" defaultValue={filters.source ?? ""} />
              <Input
                name="severity"
                placeholder="severity"
                defaultValue={filters.severity ?? ""}
              />
              <Input
                name="projectId"
                placeholder="project_id"
                defaultValue={filters.projectId ?? ""}
              />
              <Input name="userId" placeholder="user_id" defaultValue={filters.userId ?? ""} />
              <Input name="search" placeholder="title or description" defaultValue={filters.search ?? ""} />
              <Input name="from" type="date" defaultValue={filters.from ?? ""} />
              <Input name="to" type="date" defaultValue={filters.to ?? ""} />
              <div className="flex gap-2 md:col-span-2">
                <Button type="submit">Apply filters</Button>
                <Button type="button" variant="outline" asChild>
                  <Link href={"/admin/audit-logs" as Route}>Reset</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent audit events</CardTitle>
            <CardDescription>{auditLogs.length} events loaded</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {auditLogs.length === 0 ? (
              <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
                No audit logs match these filters.
              </p>
            ) : (
              auditLogs.map((auditLog) => (
                <AuditLogRow key={auditLog.id} auditLog={auditLog} />
              ))
            )}
            {nextCursor ? (
              <Button variant="outline" asChild>
                <Link href={nextPageHref(filters, nextCursor) as Route}>
                  Next page
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function loadAuditLogs(filters: AuditLogFilters): Promise<{
  auditLogs: AuditLog[];
  nextCursor: string | null;
}> {
  const limit = 50;
  let query = createSupabaseAdminClient()
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.action) query = query.eq("action", filters.action);
  if (filters.actorType) query = query.eq("actor_type", filters.actorType);
  if (filters.entityType) query = query.eq("entity_type", filters.entityType);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.severity) query = query.eq("severity", filters.severity);
  if (filters.projectId) query = query.eq("project_id", filters.projectId);
  if (filters.userId) query = query.eq("user_id", filters.userId);
  if (filters.cursor) query = query.lt("created_at", filters.cursor);
  if (filters.from) query = query.gte("created_at", dateStart(filters.from));
  if (filters.to) query = query.lte("created_at", dateEnd(filters.to));
  if (filters.search) {
    const pattern = `%${filters.search
      .replaceAll("%", "\\%")
      .replaceAll("_", "\\_")}%`;
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const auditLogs = (data ?? []).map(toAuditLog);
  return {
    auditLogs,
    nextCursor:
      auditLogs.length === limit ? auditLogs.at(-1)?.createdAt ?? null : null,
  };
}

function AuditLogRow({ auditLog }: { auditLog: AuditLog }) {
  return (
    <Link
      href={`/admin/audit-logs/${auditLog.id}` as Route}
      className="block rounded-md border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{auditLog.title}</p>
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
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {auditLog.action} · {auditLog.entityType}
          </p>
          {auditLog.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {auditLog.description}
            </p>
          ) : null}
        </div>
        <div className="shrink-0 text-sm text-muted-foreground lg:text-right">
          <p>{formatDate(auditLog.createdAt)}</p>
          <p>{auditLog.source ?? "no source"}</p>
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
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to inspect audit logs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}

interface AuditLogFilters {
  action: string | null;
  actorType: string | null;
  entityType: string | null;
  source: string | null;
  severity: string | null;
  projectId: string | null;
  userId: string | null;
  from: string | null;
  to: string | null;
  search: string | null;
  cursor: string | null;
}

function filterValues(
  params: Record<string, string | string[] | undefined>
): AuditLogFilters {
  return {
    action: singleParam(params.action),
    actorType: singleParam(params.actorType),
    entityType: singleParam(params.entityType),
    source: singleParam(params.source),
    severity: singleParam(params.severity),
    projectId: singleParam(params.projectId),
    userId: singleParam(params.userId),
    from: singleParam(params.from),
    to: singleParam(params.to),
    search: singleParam(params.search),
    cursor: singleParam(params.cursor),
  };
}

function nextPageHref(filters: AuditLogFilters, cursor: string) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries({ ...filters, cursor })) {
    if (value) {
      params.set(key, value);
    }
  }

  return `/admin/audit-logs?${params.toString()}`;
}

function singleParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function dateStart(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}

function dateEnd(value: string): string {
  return new Date(`${value}T23:59:59.999Z`).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
