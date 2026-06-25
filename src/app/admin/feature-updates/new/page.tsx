import { requireAdminUser } from "@/lib/auth/require-admin";
import { FeatureUpdateComposer } from "@/components/admin/FeatureUpdateComposer";

export const dynamic = "force-dynamic";

export default async function NewFeatureUpdatePage() {
  await requireAdminUser();

  return (
    <main className="marketing-container py-10">
      <section className="grid gap-6">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Admin</p>
          <h1 className="text-3xl font-semibold tracking-normal">
            New feature update
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Save as a draft first, then publish with or without notifications.
          </p>
        </div>
        <FeatureUpdateComposer />
      </section>
    </main>
  );
}
