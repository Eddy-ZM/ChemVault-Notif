import Link from "next/link";
import type { Route } from "next";
import { KeyRound, RadioTower } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiKeyAdminPanel } from "@/components/admin/ApiKeyAdminPanel";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseServiceApiKeyStore } from "@/lib/api-keys/api-key-store";

export const dynamic = "force-dynamic";

export default async function AdminApiKeysPage() {
  try {
    await requireAdminUser();
  } catch {
    return <AdminAccessState />;
  }

  const apiKeys = await createSupabaseServiceApiKeyStore().listKeys();

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <KeyRound className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal">
                Service API keys
              </h1>
              <p className="text-sm text-muted-foreground">
                Credentials for trusted ChemVault services and workers.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href={"/admin/webhook-events" as Route}>
              <RadioTower data-icon="inline-start" />
              Webhook events
            </Link>
          </Button>
        </div>

        <ApiKeyAdminPanel
          initialApiKeys={apiKeys.map((key) => ({
            id: key.id,
            name: key.name,
            keyPrefix: key.keyPrefix,
            serviceName: key.serviceName,
            allowedSources: key.allowedSources,
            scopes: key.scopes,
            active: key.active,
            lastUsedAt: key.lastUsedAt,
            expiresAt: key.expiresAt,
            createdAt: key.createdAt,
          }))}
        />
      </div>
    </main>
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
              Add your signed-in email to CHEMVAULT_ADMIN_EMAILS to manage
              service API keys.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </main>
  );
}
