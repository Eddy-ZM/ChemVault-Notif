import { notFound } from "next/navigation";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseFeatureUpdateStore } from "@/lib/feature-updates/feature-update-store";
import { FeatureUpdateAdminPanel } from "@/components/admin/FeatureUpdateAdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminFeatureUpdateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminUser();
  const resolvedParams = await params;
  const store = createSupabaseFeatureUpdateStore();
  const [update, targets, stats, feedback] = await Promise.all([
    store.getUpdate(resolvedParams.id),
    store.listTargets(resolvedParams.id),
    store.getStats(resolvedParams.id),
    store.listFeedback({ featureUpdateId: resolvedParams.id, limit: 20 }),
  ]);

  if (!update) {
    notFound();
  }

  return (
    <main className="marketing-container py-10">
      <section className="grid gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            {update.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage content, publication, notifications, and feedback.
          </p>
        </div>
        <FeatureUpdateAdminPanel
          update={update}
          targets={targets}
          stats={stats}
          feedback={feedback}
        />
      </section>
    </main>
  );
}
