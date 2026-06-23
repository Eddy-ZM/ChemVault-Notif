"use client";

import { useState } from "react";
import { KeyRound, Loader2, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { API_KEY_SCOPES, type ApiKeyScope } from "@/types/webhooks";

export interface SafeApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  serviceName: string;
  allowedSources: string[];
  scopes: ApiKeyScope[];
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface ApiKeyAdminPanelProps {
  initialApiKeys: SafeApiKey[];
}

export function ApiKeyAdminPanel({ initialApiKeys }: ApiKeyAdminPanelProps) {
  const [apiKeys, setApiKeys] = useState(initialApiKeys);
  const [creating, setCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function createKey(formData: FormData) {
    setCreating(true);
    setError(null);
    setRawKey(null);

    try {
      const response = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          name: formData.get("name"),
          serviceName: formData.get("serviceName"),
          mode: formData.get("mode"),
          scopes: formData.getAll("scopes"),
          allowedSources: commaList(formData.get("allowedSources")),
          expiresAt: formData.get("expiresAt"),
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create API key.");
      }

      const data = (await response.json()) as SafeApiKey & { rawKey: string };
      setRawKey(data.rawKey);
      setApiKeys((current) => [data, ...current]);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create API key."
      );
    } finally {
      setCreating(false);
    }
  }

  async function setActive(apiKeyId: string, active: boolean) {
    const response = await fetch(`/api/admin/api-keys/${apiKeyId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({ active }),
    });

    if (!response.ok) {
      setError("Unable to update API key.");
      return;
    }

    setApiKeys((current) =>
      current.map((key) => (key.id === apiKeyId ? { ...key, active } : key))
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="size-4" aria-hidden="true" />
            Create API key
          </CardTitle>
          <CardDescription>
            Raw keys are shown once. Store them securely.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createKey} className="flex flex-col gap-4">
            <Field label="Name">
              <Input name="name" placeholder="AI extractor worker" required />
            </Field>
            <Field label="Service name">
              <Input name="serviceName" placeholder="ai-extractor" required />
            </Field>
            <Field label="Mode">
              <select
                name="mode"
                className="h-10 rounded-md border bg-background px-3 text-sm"
                defaultValue="test"
              >
                <option value="test">test</option>
                <option value="live">live</option>
              </select>
            </Field>
            <Field label="Allowed sources">
              <Textarea
                name="allowedSources"
                placeholder="ai-extractor, chemvault-files"
                className="min-h-20"
              />
            </Field>
            <Field label="Expires at">
              <Input name="expiresAt" type="datetime-local" />
            </Field>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Scopes</p>
              <div className="grid gap-2">
                {API_KEY_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="scopes" value={scope} />
                    <span>{scope}</span>
                  </label>
                ))}
              </div>
            </div>
            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : null}
              Create key
            </Button>
          </form>
          {rawKey ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-950">
                This key will only be shown once. Store it securely.
              </p>
              <code className="mt-2 block break-all rounded bg-white p-2 text-xs text-amber-950">
                {rawKey}
              </code>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Service API keys</CardTitle>
          <CardDescription>
            Manage trusted ChemVault service credentials.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {apiKeys.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No API keys have been created.
            </p>
          ) : (
            apiKeys.map((key) => (
              <div key={key.id} className="rounded-md border bg-card p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{key.name}</p>
                      <Badge variant={key.active ? "default" : "secondary"}>
                        {key.active ? "Active" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {key.serviceName} · {key.keyPrefix}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setActive(key.id, !key.active)}
                  >
                    <ShieldOff data-icon="inline-start" />
                    {key.active ? "Disable" : "Enable"}
                  </Button>
                </div>
                <Separator className="my-3" />
                <div className="grid gap-3 text-sm lg:grid-cols-2">
                  <Meta label="Scopes" value={key.scopes.join(", ") || "none" } />
                  <Meta
                    label="Allowed sources"
                    value={key.allowedSources.join(", ") || "any source"}
                  />
                  <Meta label="Last used" value={formatDate(key.lastUsedAt)} />
                  <Meta label="Expires" value={formatDate(key.expiresAt)} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  );
}

function commaList(value: FormDataEntryValue | null): string[] {
  return typeof value === "string"
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

function formatDate(value: string | null) {
  if (!value) {
    return "never";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
