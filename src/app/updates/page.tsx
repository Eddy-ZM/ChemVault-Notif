import Link from "next/link";
import type { Route } from "next";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { isAdminEmail } from "@/lib/auth/require-admin";
import {
  createSupabaseFeatureUpdateStore,
  normalizeVisibleFeatureUpdateFilters,
} from "@/lib/feature-updates/feature-update-store";
import { FeatureUpdateList } from "@/components/feature-updates/FeatureUpdateList";
import { Button } from "@/components/ui/button";
import { FEATURE_UPDATE_CATEGORIES } from "@/types/feature-updates";

export const dynamic = "force-dynamic";

export default async function UpdatesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user } = await getAuthenticatedSupabase();
  const resolvedSearchParams = (await searchParams) ?? {};
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(resolvedSearchParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const updates = await createSupabaseFeatureUpdateStore().listVisibleUpdates({
    ...normalizeVisibleFeatureUpdateFilters(params),
    userId: user?.id,
    isAdmin: isAdminEmail(user?.email),
    limit: 50,
  });
  const activeCategory = params.get("category");

  return (
    <main className="marketing-container py-10">
      <section className="grid gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-muted-foreground">
            ChemVault changelog
          </p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Product updates
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
            Release notes, workflow improvements, maintenance notices, and
            important ChemVault platform changes.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            asChild
            size="sm"
            variant={activeCategory ? "outline" : "default"}
          >
            <Link href={"/updates" as Route}>All</Link>
          </Button>
          {FEATURE_UPDATE_CATEGORIES.map((category) => (
            <Button
              key={category}
              asChild
              size="sm"
              variant={activeCategory === category ? "default" : "outline"}
            >
              <Link href={`/updates?category=${category}` as Route}>
                {category.replaceAll("_", " ")}
              </Link>
            </Button>
          ))}
        </div>

        <FeatureUpdateList updates={updates} />
      </section>
    </main>
  );
}
