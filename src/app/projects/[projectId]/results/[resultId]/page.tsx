import Link from "next/link";
import type { Route } from "next";
import { ArrowLeft, Beaker, Files } from "lucide-react";
import { ResultReviewWorkspace } from "@/components/results/ResultReviewWorkspace";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAuthenticatedSupabase } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export default async function ProjectResultDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; resultId: string }>;
}) {
  const { projectId, resultId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return <AuthRequiredState />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Beaker className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Result review
              </h1>
              <p className="text-sm text-muted-foreground">{resultId}</p>
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
              <Link href={`/projects/${projectId}/results` as Route}>
                <ArrowLeft data-icon="inline-start" />
                All results
              </Link>
            </Button>
          </div>
        </div>

        <ResultReviewWorkspace projectId={projectId} resultId={resultId} />
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
              You need an authenticated ChemVault session to review this result.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
