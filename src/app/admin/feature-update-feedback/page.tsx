import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseFeatureUpdateStore } from "@/lib/feature-updates/feature-update-store";
import { FeatureUpdateFeedbackAdminList } from "@/components/admin/FeatureUpdateFeedbackAdminList";

export const dynamic = "force-dynamic";

export default async function FeatureUpdateFeedbackPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminUser();
  const resolvedSearchParams = (await searchParams) ?? {};
  const status =
    typeof resolvedSearchParams.status === "string"
      ? resolvedSearchParams.status
      : null;
  const updateId =
    typeof resolvedSearchParams.updateId === "string"
      ? resolvedSearchParams.updateId
      : null;
  const feedback = await createSupabaseFeatureUpdateStore().listFeedback({
    status,
    featureUpdateId: updateId,
    limit: 100,
  });

  return (
    <main className="marketing-container py-10">
      <section className="grid gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            Feature update feedback
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Review user feedback submitted from changelog and release note pages.
          </p>
        </div>
        <FeatureUpdateFeedbackAdminList feedback={feedback} />
      </section>
    </main>
  );
}
