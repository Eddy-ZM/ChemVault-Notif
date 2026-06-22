import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { toChemVaultExtractionTask } from "@/lib/tasks/types";
import { ExtractionTaskStatus } from "@/components/tasks/ExtractionTaskStatus";

export const dynamic = "force-dynamic";

export default async function ProjectTasksPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { supabase, user } = await getAuthenticatedSupabase();

  if (!user) {
    return <SignedOutState />;
  }

  const { data, error } = await supabase
    .from("extraction_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const tasks = (data ?? []).map(toChemVaultExtractionTask);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ClipboardList className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Extraction tasks
              </h1>
              <p className="text-sm text-muted-foreground">
                Project {projectId}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{tasks.length} tasks</Badge>
            <Button variant="outline" asChild>
              <Link href="/">
                <ArrowLeft data-icon="inline-start" />
                Dashboard
              </Link>
            </Button>
          </div>
        </div>

        {error ? (
          <StateCard
            title="Unable to load extraction tasks"
            description={error.message}
          />
        ) : tasks.length === 0 ? (
          <StateCard
            title="No extraction tasks yet"
            description="AI extraction tasks for this project will appear here as files enter the processing workflow."
          />
        ) : (
          <div className="flex flex-col gap-3">
            {tasks.map((task) => (
              <ExtractionTaskStatus
                key={task.id}
                task={task}
                detailHref={`/projects/${projectId}/tasks/${task.id}`}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function SignedOutState() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-16">
        <StateCard
          title="Sign in required"
          description="You need an authenticated ChemVault session to view extraction tasks."
        />
      </div>
    </main>
  );
}

function StateCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Task status updates are written by trusted ChemVault services.
        </p>
      </CardContent>
    </Card>
  );
}
