"use client";

import type { Route } from "next";
import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Megaphone,
  Send,
  ShieldAlert,
} from "lucide-react";
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
import type {
  Broadcast,
  BroadcastJson,
  BroadcastTargetType,
  UserSegment,
} from "@/types/broadcasts";

interface BroadcastComposerProps {
  segments: Array<UserSegment & { memberCount: number }>;
}

interface PreviewState {
  recipientCount: number;
  sampleRecipients: string[];
}

export function BroadcastComposer({ segments }: BroadcastComposerProps) {
  const router = useRouter();
  const [targetType, setTargetType] =
    useState<BroadcastTargetType>("selected_users");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdBroadcast, setCreatedBroadcast] = useState<Broadcast | null>(
    null
  );

  async function previewRecipients(formData: FormData) {
    setError(null);
    setPreview(null);

    try {
      const response = await fetch("/api/admin/broadcasts/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          targetType,
          targetPayload: targetPayloadFromForm(formData, targetType),
        }),
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      setPreview((await response.json()) as PreviewState);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Unable to preview recipients."
      );
    }
  }

  async function saveDraft(formData: FormData): Promise<Broadcast> {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(broadcastPayloadFromForm(formData, targetType)),
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const data = (await response.json()) as { broadcast: Broadcast };
      setCreatedBroadcast(data.broadcast);
      router.refresh();
      return data.broadcast;
    } finally {
      setSaving(false);
    }
  }

  async function saveDraftAction(formData: FormData) {
    try {
      const broadcast = await saveDraft(formData);
      router.push(`/admin/broadcasts/${broadcast.id}` as Route);
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save draft."
      );
    }
  }

  async function sendNow(formData: FormData) {
    setSending(true);
    setError(null);

    try {
      const broadcast = await saveDraft(formData);
      const response = await fetch(`/api/admin/broadcasts/${broadcast.id}/send`, {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      router.push(`/admin/broadcasts/${broadcast.id}` as Route);
      router.refresh();
    } catch (sendError) {
      setError(
        sendError instanceof Error ? sendError.message : "Unable to send broadcast."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <form className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Megaphone className="size-4" aria-hidden="true" />
            Broadcast draft
          </CardTitle>
          <CardDescription>
            Create an audited notification for a specific ChemVault audience.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Title">
            <Input name="title" required placeholder="Scheduled maintenance" />
          </Field>
          <Field label="Body">
            <Textarea
              name="body"
              required
              className="min-h-28"
              placeholder="ChemVault will be unavailable tonight."
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Type">
              <Input name="type" defaultValue="system" />
            </Field>
            <Field label="Source">
              <Input name="source" defaultValue="admin" />
            </Field>
            <Field label="Link">
              <Input name="link" defaultValue="/notifications" />
            </Field>
          </div>
          <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
            <input type="checkbox" name="ignorePreferences" />
            <span>
              <span className="font-medium">
                Ignore user notification preferences for this broadcast
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Only use this for critical service or safety notices.
              </span>
            </span>
          </label>
          <p className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4" aria-hidden="true" />
            Ignoring preferences should only be used for critical service or
            safety notices.
          </p>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Target">
              <select
                name="targetType"
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
            <label className="flex items-center gap-2 self-end rounded-md border px-3 py-2 text-sm">
              <input type="checkbox" name="pushPreviewAllowed" />
              <span>Allow Web Push body preview</span>
            </label>
          </div>
          <TargetFields targetType={targetType} segments={segments} />
          {targetType === "all_users" ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <div className="flex items-center gap-2 font-medium">
                <ShieldAlert className="size-4" aria-hidden="true" />
                Broadcast-to-all requires explicit confirmation.
              </div>
              <Input
                name="confirmAllUsersText"
                className="mt-3 bg-background"
                placeholder="Type CONFIRM"
              />
            </div>
          ) : null}
          {error ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {createdBroadcast ? (
            <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              Draft saved: {createdBroadcast.id}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={(event) =>
                previewRecipients(new FormData(event.currentTarget.form!))
              }
            >
              Preview recipients
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={saving || sending}
              onClick={(event) =>
                saveDraftAction(new FormData(event.currentTarget.form!))
              }
            >
              {saving ? <Loader2 className="animate-spin" /> : null}
              Save draft
            </Button>
            <Button
              type="button"
              disabled={saving || sending}
              onClick={(event) => sendNow(new FormData(event.currentTarget.form!))}
            >
              {sending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send data-icon="inline-start" />
              )}
              Send now
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">Recipient preview</CardTitle>
          <CardDescription>
            Review count and sample user IDs before sending.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preview ? (
            <div className="grid gap-3">
              <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2">
                <span className="text-sm text-muted-foreground">Recipients</span>
                <Badge>{preview.recipientCount}</Badge>
              </div>
              <div className="grid gap-2">
                {preview.sampleRecipients.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
                    No recipients matched this target.
                  </p>
                ) : (
                  preview.sampleRecipients.map((userId) => (
                    <code
                      key={userId}
                      className="break-all rounded-md bg-muted px-2 py-1 text-xs"
                    >
                      {userId}
                    </code>
                  ))
                )}
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              Run preview to resolve the current target.
            </p>
          )}
        </CardContent>
      </Card>
    </form>
  );
}

function TargetFields({
  targetType,
  segments,
}: {
  targetType: BroadcastTargetType;
  segments: Array<UserSegment & { memberCount: number }>;
}) {
  switch (targetType) {
    case "single_user":
      return (
        <Field label="User ID">
          <Input name="userId" placeholder="00000000-0000-4000-8000-000000000000" />
        </Field>
      );
    case "selected_users":
      return (
        <Field label="User IDs">
          <Textarea
            name="userIds"
            className="min-h-28 font-mono text-xs"
            placeholder="One user ID per line or comma-separated"
          />
        </Field>
      );
    case "project_members":
      return (
        <Field label="Project ID">
          <Input
            name="projectId"
            placeholder="00000000-0000-4000-8000-000000000000"
          />
        </Field>
      );
    case "segment":
      return (
        <Field label="Segment">
          <select
            name="segmentId"
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="">Select a segment</option>
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name} ({segment.memberCount})
              </option>
            ))}
          </select>
        </Field>
      );
    case "all_users":
      return null;
  }
}

function broadcastPayloadFromForm(
  formData: FormData,
  targetType: BroadcastTargetType
) {
  return {
    title: textValue(formData, "title"),
    body: textValue(formData, "body"),
    type: textValue(formData, "type") || "system",
    source: textValue(formData, "source") || "admin",
    link: textValue(formData, "link") || "/notifications",
    ignorePreferences: formData.get("ignorePreferences") === "on",
    targetType,
    targetPayload: targetPayloadFromForm(formData, targetType),
  };
}

function targetPayloadFromForm(
  formData: FormData,
  targetType: BroadcastTargetType
): BroadcastJson {
  const payload: BroadcastJson = {};

  if (targetType === "single_user") {
    payload.userId = textValue(formData, "userId");
  }

  if (targetType === "selected_users") {
    payload.userIds = textValue(formData, "userIds")
      .split(/[\n,]/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  if (targetType === "project_members") {
    payload.projectId = textValue(formData, "projectId");
  }

  if (targetType === "segment") {
    payload.segmentId = textValue(formData, "segmentId");
  }

  if (targetType === "all_users") {
    payload.confirmAllUsers =
      textValue(formData, "confirmAllUsersText") === "CONFIRM";
  }

  if (formData.get("pushPreviewAllowed") === "on") {
    payload.pushPreviewAllowed = true;
  }

  return payload;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
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
