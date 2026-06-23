import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Database } from "lucide-react";
import { ApprovedDatasetView } from "@/components/results/ApprovedDatasetView";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { assertProjectAccess } from "@/lib/files/access";
import { NotificationError } from "@/lib/notifications/errors";
import { createSupabaseResultStore } from "@/lib/results/result-store";

export const dynamic = "force-dynamic";

export default async function ProjectDatasetDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; datasetId: string }>;
}) {
  const { projectId, datasetId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return <AuthRequiredState />;
  }

  await assertProjectAccess({ projectId, user });
  const store = createSupabaseResultStore();
  const dataset = await store.getApprovedDataset(datasetId);

  if (!dataset || dataset.projectId !== projectId) {
    throw new NotificationError("Approved dataset not found.", undefined, 404);
  }

  const result = dataset.resultId ? await store.getResult(dataset.resultId) : null;

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
                Approved dataset
              </h1>
              <p className="text-sm text-muted-foreground">{dataset.title}</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/projects/${projectId}/datasets` as Route}>
              <ArrowLeft data-icon="inline-start" />
              Datasets
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dataset metadata</CardTitle>
            <CardDescription>
              Links back to the reviewed extraction result, source file, and task.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Meta label="Dataset" value={dataset.id} />
            <Meta label="Schema" value={dataset.schemaVersion} />
            <Meta label="Result" value={dataset.resultId ?? "n/a"} />
            <Meta label="File" value={dataset.fileId ?? "n/a"} />
            <Meta label="Task" value={result?.taskId ?? "n/a"} />
            <Meta label="Model" value={result?.modelName ?? "not recorded"} />
            <Meta label="Project" value={projectId} />
            <Meta label="Created" value={new Date(dataset.createdAt).toLocaleString()} />
          </CardContent>
        </Card>

        <ApprovedDatasetView dataset={dataset} />
      </div>
    </main>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Separator className="my-2" />
      <p className="truncate font-medium">{value}</p>
    </div>
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
