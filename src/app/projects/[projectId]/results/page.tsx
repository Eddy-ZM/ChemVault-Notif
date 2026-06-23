import Link from "next/link";
import type { Route } from "next";
import { Activity, ArrowLeft, Beaker, Files } from "lucide-react";
import { ExtractionResultList } from "@/components/results/ExtractionResultList";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedSupabase } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export default async function ProjectResultsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return <AuthRequiredState />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Beaker className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Extraction results
              </h1>
              <p className="text-sm text-muted-foreground">
                Human review, approval, and exports for project {projectId}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/files` as Route}>
                <Files data-icon="inline-start" />
                Files
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}/activity` as Route}>
                <Activity data-icon="inline-start" />
                Activity
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={"/" as Route}>
                <ArrowLeft data-icon="inline-start" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        <ExtractionResultList projectId={projectId} />
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
              Extraction results are available to authenticated project members.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
