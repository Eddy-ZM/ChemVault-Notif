"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertTriangle, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Broadcast, BroadcastTargetType } from "@/types/broadcasts";

interface BroadcastDraftEditorProps {
  initialBroadcast: Broadcast;
}

export function BroadcastDraftEditor({
  initialBroadcast,
}: BroadcastDraftEditorProps) {
  const router = useRouter();
  const [targetType, setTargetType] = useState<BroadcastTargetType>(
    initialBroadcast.targetType
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(formData: FormData) {
    setSaving(true);
    setError(null);

    try {
      const targetPayloadText = textValue(formData, "targetPayload");
      const response = await fetch(
        `/api/admin/broadcasts/${initialBroadcast.id}` as Route,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            title: textValue(formData, "title"),
            body: textValue(formData, "body"),
            type: textValue(formData, "type") || "system",
            source: textValue(formData, "source") || "admin",
            link: textValue(formData, "link") || null,
            ignorePreferences: formData.get("ignorePreferences") === "on",
            targetType,
            targetPayload: JSON.parse(targetPayloadText || "{}"),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save draft."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit draft</CardTitle>
        <CardDescription>
          Draft fields are locked once the broadcast has been sent.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={save} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title">
              <Input name="title" defaultValue={initialBroadcast.title} />
            </Field>
            <Field label="Link">
              <Input name="link" defaultValue={initialBroadcast.link ?? ""} />
            </Field>
          </div>
          <Field label="Body">
            <Textarea
              name="body"
              className="min-h-24"
              defaultValue={initialBroadcast.body}
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Type">
              <Input name="type" defaultValue={initialBroadcast.type} />
            </Field>
            <Field label="Source">
              <Input name="source" defaultValue={initialBroadcast.source} />
            </Field>
            <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
              <input
                type="checkbox"
                name="ignorePreferences"
                defaultChecked={initialBroadcast.ignorePreferences}
              />
              <span>
                <span className="font-medium">
                  Ignore user notification preferences for this broadcast
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Only use this for critical service or safety notices.
                </span>
              </span>
            </label>
            <Field label="Target type">
              <select
                value={targetType}
                onChange={(event) =>
                  setTargetType(event.target.value as BroadcastTargetType)
                }
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="single_user">Single user</option>
                <option value="selected_users">Selected users</option>
                <option value="project_members">Project members</option>
                <option value="segment">User segment</option>
                <option value="all_users">All users</option>
              </select>
            </Field>
          </div>
          <Field label="Target payload JSON">
            <Textarea
              name="targetPayload"
                className="min-h-40 font-mono text-xs"
                defaultValue={JSON.stringify(
                  initialBroadcast.targetPayload,
                  null,
                  2
                )}
              />
            </Field>
            <p className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 flex items-start gap-2">
              <AlertTriangle
                className="mt-0.5 size-4"
                aria-hidden="true"
              />
              Ignoring preferences should only be used for critical service or
              safety notices.
            </p>
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            Save draft
          </Button>
        </form>
      </CardContent>
    </Card>
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
    <label className="grid gap-2">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string; detail?: string };
    return data.error ?? data.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
