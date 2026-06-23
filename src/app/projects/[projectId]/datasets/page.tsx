import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Database, FileJson } from "lucide-react";
import { formatRelativeTime } from "@/components/notifications/time";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { assertProjectAccess } from "@/lib/files/access";
import { createSupabaseResultStore } from "@/lib/results/result-store";

export const dynamic = "force-dynamic";

export default async function ProjectDatasetsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return <AuthRequiredState />;
  }

  await assertProjectAccess({ projectId, user });
  const datasets = await createSupabaseResultStore().listApprovedDatasets(projectId);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Database className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Approved datasets
              </h1>
              <p className="text-sm text-muted-foreground">
                Human-approved scientific data for project {projectId}
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/results` as Route}>
              <ArrowLeft data-icon="inline-start" />
              Results
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Datasets</CardTitle>
            <CardDescription>
              Approved extraction outputs saved as structured ChemVault datasets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {datasets.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-6 py-12 text-center">
                <FileJson className="size-9 text-muted-foreground" />
                <p className="text-sm font-medium">No approved datasets</p>
                <p className="max-w-sm text-sm leading-6 text-muted-foreground">
                  Approved extraction results will appear here as reusable
                  structured data.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dataset</TableHead>
                    <TableHead>Schema</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {datasets.map((dataset) => (
                    <TableRow key={dataset.id}>
                      <TableCell>
                        <Link
                          href={
                            `/projects/${projectId}/datasets/${dataset.id}` as Route
                          }
                          className="font-medium hover:underline"
                        >
                          {dataset.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dataset.description ?? dataset.id}
                        </p>
                      </TableCell>
                      <TableCell>{dataset.schemaVersion}</TableCell>
                      <TableCell>{formatRelativeTime(dataset.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

async function getCurrentUser() {
  try {
    const { user } = await getAuthenticatedSupabase();
    return user;
  } catch {
    return null;
  }
}

function AuthRequiredState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              Approved datasets are available to authenticated project members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
