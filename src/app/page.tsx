import Link from "next/link";
import type { Route } from "next";
import { Activity, Database, FlaskConical, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const workflowItems = [
  {
    title: "AI extraction",
    description: "Completion and failure updates from scientific data tasks.",
    icon: FlaskConical,
  },
  {
    title: "File processing",
    description: "Upload, parsing, and background processing state changes.",
    icon: Database,
  },
  {
    title: "System notices",
    description: "Admin messages, announcements, and platform maintenance.",
    icon: ShieldCheck,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b bg-card/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Activity className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold leading-5">
                ChemVault
              </span>
              <span className="block text-xs text-muted-foreground">
                Notification Center
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href={"/conversations" as Route}>Messages</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/notifications">View all</Link>
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit">
              Web MVP
            </Badge>
            <div className="flex flex-col gap-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-normal sm:text-4xl">
                Unified notifications for ChemVault services
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                A reusable notification center for task results, file workflows,
                permission changes, and system announcements across the
                ChemVault ecosystem.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/notifications">Open notification center</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={"/conversations" as Route}>Open messages</Link>
              </Button>
              <Button variant="outline" asChild>
                <a href="#integration">Integration shape</a>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {workflowItems.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.title}>
                  <CardHeader className="gap-3">
                    <span className="flex size-9 items-center justify-center rounded-md bg-accent text-accent-foreground">
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        <Card className="h-fit shadow-soft">
          <CardHeader>
            <CardTitle>Embed target</CardTitle>
            <CardDescription>
              Place the bell in any authenticated ChemVault dashboard header.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="rounded-md border bg-muted/40 p-4">
              <div className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2 shadow-sm">
                <div>
                  <p className="text-sm font-medium">App header</p>
                  <p className="text-xs text-muted-foreground">
                    Current signed-in researcher
                  </p>
                </div>
                <NotificationBell />
              </div>
            </div>
            <div id="integration" className="rounded-md bg-secondary p-4">
              <p className="text-sm font-medium">Internal service API</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Services call <code>/api/notifications</code> with the internal
                ChemVault key. Browser clients read and update notifications
                through Supabase Auth and RLS.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
