import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { isAdminEmail } from "@/lib/auth/require-admin";
import { canViewFeatureUpdate } from "@/lib/feature-updates/can-view-feature-update";
import { createSupabaseFeatureUpdateStore } from "@/lib/feature-updates/feature-update-store";
import { markFeatureUpdateRead } from "@/lib/feature-updates/mark-feature-update-read";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FeatureUpdateBadge } from "@/components/feature-updates/FeatureUpdateBadge";
import { FeatureUpdateFeedbackForm } from "@/components/feature-updates/FeatureUpdateFeedbackForm";
import { FeatureUpdateReactionBar } from "@/components/feature-updates/FeatureUpdateReactionBar";

export const dynamic = "force-dynamic";

export default async function FeatureUpdateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { user } = await getAuthenticatedSupabase();
  const resolvedParams = await params;
  const store = createSupabaseFeatureUpdateStore();
  const update = await store.getUpdateBySlug(resolvedParams.slug);
  const isAdmin = isAdminEmail(user?.email);

  if (
    !update ||
    !(await canViewFeatureUpdate({
      update,
      userId: user?.id,
      isAdmin,
      store,
    }))
  ) {
    notFound();
  }

  if (user) {
    await markFeatureUpdateRead({
      updateId: update.id,
      userId: user.id,
      isAdmin,
    }).catch(() => undefined);
  }

  return (
    <main className="marketing-container py-10">
      <article className="mx-auto grid max-w-4xl gap-6">
        <Button asChild variant="ghost" className="w-fit">
          <Link href={"/updates" as Route}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to updates
          </Link>
        </Button>

        <header className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <FeatureUpdateBadge value={update.category} />
            {update.version ? (
              <span className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {update.version}
              </span>
            ) : null}
            <span className="text-sm text-muted-foreground">
              {formatDate(update.publishedAt ?? update.createdAt)}
            </span>
          </div>
          <div className="grid gap-3">
            <h1 className="text-3xl font-semibold tracking-normal">
              {update.title}
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              {update.summary}
            </p>
          </div>
        </header>

        <Separator />

        <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-7 dark:prose-invert">
          {update.content}
        </div>

        {Array.isArray(update.metadata.relatedLinks) ? (
          <section className="rounded-md border p-4">
            <h2 className="text-sm font-medium">Related links</h2>
            <div className="mt-3 grid gap-2">
              {update.metadata.relatedLinks
                .filter(isRelatedLink)
                .map((link) => (
                  <Link
                    key={link.href}
                    href={link.href as Route}
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
            </div>
          </section>
        ) : null}

        {user ? (
          <section className="grid gap-6 rounded-md border p-4">
            <FeatureUpdateReactionBar
              updateId={update.id}
              initialReaction={update.reaction}
            />
            <Separator />
            <FeatureUpdateFeedbackForm updateId={update.id} />
          </section>
        ) : (
          <p className="rounded-md border p-4 text-sm text-muted-foreground">
            Sign in to mark updates as read, react, or send feedback.
          </p>
        )}
      </article>
    </main>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function isRelatedLink(value: unknown): value is { label: string; href: string } {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    typeof (value as { label?: unknown }).label === "string" &&
    typeof (value as { href?: unknown }).href === "string"
  );
}
