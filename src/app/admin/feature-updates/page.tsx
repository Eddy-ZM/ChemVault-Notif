import Link from "next/link";
import type { Route } from "next";
import { Plus } from "lucide-react";
import { requireAdminUser } from "@/lib/auth/require-admin";
import {
  createSupabaseFeatureUpdateStore,
  normalizeFeatureUpdateFilters,
} from "@/lib/feature-updates/feature-update-store";
import { Button } from "@/components/ui/button";
import { FeatureUpdateBadge } from "@/components/feature-updates/FeatureUpdateBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function AdminFeatureUpdatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const updates = await createSupabaseFeatureUpdateStore().listAdminUpdates(
    normalizeFeatureUpdateFilters(params)
  );

  return (
    <main className="marketing-container py-10">
      <section className="grid gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Admin</p>
            <h1 className="text-3xl font-semibold tracking-normal">
              Feature updates
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Draft, publish, and archive ChemVault product updates and release
              notes.
            </p>
          </div>
          <Button asChild>
            <Link href={"/admin/feature-updates/new" as Route}>
              <Plus className="size-4" aria-hidden="true" />
              Create update
            </Link>
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Published</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {updates.map((update) => (
                <TableRow key={update.id}>
                  <TableCell>
                    <Link
                      href={`/admin/feature-updates/${update.id}` as Route}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {update.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted-foreground">
                      /updates/{update.slug}
                    </p>
                  </TableCell>
                  <TableCell>
                    <FeatureUpdateBadge value={update.status} kind="status" />
                  </TableCell>
                  <TableCell>
                    <FeatureUpdateBadge value={update.category} />
                  </TableCell>
                  <TableCell>
                    <FeatureUpdateBadge
                      value={update.visibility}
                      kind="visibility"
                    />
                  </TableCell>
                  <TableCell>{update.version ?? "n/a"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {update.publishedAt
                      ? new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(update.publishedAt))
                      : "Not published"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </main>
  );
}
