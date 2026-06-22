import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ExtractionTaskStatus } from "@/components/tasks/ExtractionTaskStatus";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { toChemVaultExtractionTask } from "@/lib/tasks/types";

export const dynamic = "force-dynamic";

export default async function ProjectTaskDetailsPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  const { supabase, user } = await getAuthenticatedSupabase();

  if (!user) {
    return <SignedOutState />;
  }

  const { data, error } = await supabase
    .from("extraction_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    notFound();
  }

  const task = toChemVaultExtractionTask(data);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ClipboardList className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Extraction task details
              </h1>
              <p className="text-sm text-muted-foreground">{task.id}</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href={`/projects/${projectId}/tasks`}>
              <ArrowLeft data-icon="inline-start" />
              All tasks
            </a>
          </Button>
        </div>

        <ExtractionTaskStatus task={task} />

        <Card>
          <CardHeader>
            <CardTitle>Task metadata</CardTitle>
            <CardDescription>
              Worker-provided extraction details stored with this task.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="max-h-[28rem] overflow-auto rounded-md bg-muted p-4 text-xs leading-5 text-muted-foreground">
              {JSON.stringify(task.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function SignedOutState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>
              You need an authenticated ChemVault session to view this task.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
