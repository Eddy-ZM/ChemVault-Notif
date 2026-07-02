import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  BellRing,
  FileSearch,
  KeyRound,
  Megaphone,
  MessageSquareText,
  Plus,
  RadioTower,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAdminUser } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

const adminSections: Array<{
  title: string;
  description: string;
  href: Route;
  icon: LucideIcon;
}> = [
  {
    title: "Service API keys",
    description: "Create, scope, enable, and disable trusted service credentials.",
    href: "/admin/api-keys",
    icon: KeyRound,
  },
  {
    title: "Webhook events",
    description: "Inspect trusted service submissions, processing state, and event logs.",
    href: "/admin/webhook-events",
    icon: RadioTower,
  },
  {
    title: "Broadcasts",
    description: "Draft, preview, send, and audit targeted notification campaigns.",
    href: "/admin/broadcasts",
    icon: Megaphone,
  },
  {
    title: "User segments",
    description: "Manage recipient groups used by broadcasts and release notes.",
    href: "/admin/user-segments",
    icon: UsersRound,
  },
  {
    title: "Feature updates",
    description: "Draft, publish, target, and archive ChemVault release notes.",
    href: "/admin/feature-updates",
    icon: Sparkles,
  },
  {
    title: "Update feedback",
    description: "Review user reactions, ratings, and written changelog feedback.",
    href: "/admin/feature-update-feedback",
    icon: MessageSquareText,
  },
  {
    title: "Audit logs",
    description: "Search structured platform, project, service, and admin events.",
    href: "/admin/audit-logs",
    icon: FileSearch,
  },
];

const quickActions: Array<{
  title: string;
  description: string;
  href: Route;
  icon: LucideIcon;
}> = [
  {
    title: "Create broadcast",
    description: "Prepare a targeted notification for users or project members.",
    href: "/admin/broadcasts/new",
    icon: BellRing,
  },
  {
    title: "Create feature update",
    description: "Draft a release note, announcement, or maintenance notice.",
    href: "/admin/feature-updates/new",
    icon: Plus,
  },
];

export default async function AdminPage() {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Admin console
              </h1>
              <p className="text-sm text-muted-foreground">
                Central access for ChemVault notifications, service intake, and audit operations.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href={"/admin/webhook-events" as Route}>
                <RadioTower data-icon="inline-start" />
                Webhooks
              </Link>
            </Button>
            <Button asChild>
              <Link href={"/admin/broadcasts/new" as Route}>
                <Plus data-icon="inline-start" />
                New broadcast
              </Link>
            </Button>
          </div>
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <AdminLinkCard key={action.href} item={action} prominent />
          ))}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {adminSections.map((section) => (
            <AdminLinkCard key={section.href} item={section} />
          ))}
        </section>
      </div>
    </main>
  );
}

function AdminLinkCard({
  item,
  prominent = false,
}: {
  item: {
    title: string;
    description: string;
    href: Route;
    icon: LucideIcon;
  };
  prominent?: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link href={item.href} className="group block h-full">
      <Card
        className={
          prominent
            ? "h-full transition-colors hover:bg-accent"
            : "h-full shadow-sm transition-colors hover:bg-accent"
        }
      >
        <CardHeader className="gap-3">
          <div className="flex items-start justify-between gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-background">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <div>
            <CardTitle className="text-base tracking-normal">{item.title}</CardTitle>
            <CardDescription className="mt-2 leading-6">
              {item.description}
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
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
              Sign in with a ChemVault admin account to open the admin console.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="https://user.chemvault.science/login">Sign in</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
