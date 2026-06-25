"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Archive, Bell, Save, Send } from "lucide-react";
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
import { FeatureUpdateBadge } from "@/components/feature-updates/FeatureUpdateBadge";
import type {
  FeatureUpdate,
  FeatureUpdateFeedback,
  FeatureUpdatePublishSummary,
  FeatureUpdateTarget,
} from "@/types/feature-updates";

interface FeatureUpdateAdminPanelProps {
  update: FeatureUpdate;
  targets: FeatureUpdateTarget[];
  stats: {
    readCount: number;
    feedbackCount: number;
    notificationCount: number;
    reactions: Record<string, number>;
  };
  feedback: FeatureUpdateFeedback[];
}

export function FeatureUpdateAdminPanel({
  update,
  targets,
  stats,
  feedback,
}: FeatureUpdateAdminPanelProps) {
  const router = useRouter();
  const editable = update.status === "draft" || update.status === "scheduled";
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishSummary, setPublishSummary] =
    useState<FeatureUpdatePublishSummary | null>(null);

  async function saveDraft(formData: FormData) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/feature-updates/${update.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          title: value(formData, "title"),
          summary: value(formData, "summary"),
          content: value(formData, "content"),
          category: value(formData, "category"),
          visibility: value(formData, "visibility"),
          version: value(formData, "version") || null,
        }),
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to update draft."
      );
    } finally {
      setSaving(false);
    }
  }

  async function publish(formData: FormData) {
    setPublishing(true);
    setError(null);
    setPublishSummary(null);

    try {
      const response = await fetch(
        `/api/admin/feature-updates/${update.id}/publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            notifyUsers: formData.get("notifyUsers") === "on",
            pushPreviewAllowed: formData.get("pushPreviewAllowed") === "on",
            confirmAllUsers: formData.get("confirmAllUsers") === "on",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const body = (await response.json()) as {
        summary: FeatureUpdatePublishSummary;
      };
      setPublishSummary(body.summary);
      router.refresh();
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Unable to publish update."
      );
    } finally {
      setPublishing(false);
    }
  }

  async function archive() {
    setArchiving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/feature-updates/${update.id}/archive`,
        {
          method: "POST",
          credentials: "same-origin",
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      router.refresh();
    } catch (archiveError) {
      setError(
        archiveError instanceof Error
          ? archiveError.message
          : "Unable to archive update."
      );
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_23rem]">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <FeatureUpdateBadge value={update.status} kind="status" />
            <FeatureUpdateBadge value={update.category} />
            <FeatureUpdateBadge value={update.visibility} kind="visibility" />
          </div>
          <CardTitle className="text-base">Update content</CardTitle>
          <CardDescription>
            Draft updates can be edited before they are published.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={saveDraft} className="grid gap-4">
            <Field label="Title">
              <Input name="title" defaultValue={update.title} disabled={!editable} />
            </Field>
            <Field label="Summary">
              <Textarea
                name="summary"
                defaultValue={update.summary}
                disabled={!editable}
                className="min-h-20"
              />
            </Field>
            <Field label="Content">
              <Textarea
                name="content"
                defaultValue={update.content}
                disabled={!editable}
                className="min-h-52"
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Category">
                <Input name="category" defaultValue={update.category} disabled={!editable} />
              </Field>
              <Field label="Visibility">
                <Input
                  name="visibility"
                  defaultValue={update.visibility}
                  disabled={!editable}
                />
              </Field>
              <Field label="Version">
                <Input
                  name="version"
                  defaultValue={update.version ?? ""}
                  disabled={!editable}
                />
              </Field>
            </div>
            {editable ? (
              <Button type="submit" className="w-fit" disabled={saving}>
                <Save className="size-4" aria-hidden="true" />
                {saving ? "Saving" : "Save changes"}
              </Button>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="grid h-fit gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publish controls</CardTitle>
            <CardDescription>
              Notifications respect user preferences unless they are critical
              categories such as security.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={publish} className="grid gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="notifyUsers" />
                <span>Notify recipients</span>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="pushPreviewAllowed" />
                <span>Allow Web Push summary preview</span>
              </label>
              <label className="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm text-amber-900">
                <input type="checkbox" name="confirmAllUsers" />
                <span>
                  Confirm all-user notification. Only use this for intentional
                  broad release announcements.
                </span>
              </label>
              <Button type="submit" disabled={publishing || update.status === "archived"}>
                <Send className="size-4" aria-hidden="true" />
                {publishing ? "Publishing" : "Publish"}
              </Button>
            </form>
            {publishSummary ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Recipients: {publishSummary.recipientCount}. Notified:{" "}
                {publishSummary.notifiedCount}. Skipped:{" "}
                {publishSummary.skippedCount}.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="size-4" aria-hidden="true" />
              Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm">
            <Stat label="Reads" value={stats.readCount} />
            <Stat label="Feedback" value={stats.feedbackCount} />
            <Stat label="Notifications" value={stats.notificationCount} />
            <Separator />
            <p className="text-xs text-muted-foreground">
              Targets:{" "}
              {targets.length > 0
                ? targets.map((target) => target.targetType).join(", ")
                : "none"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feedback</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {feedback.length === 0 ? (
              <p className="text-sm text-muted-foreground">No feedback yet.</p>
            ) : (
              feedback.slice(0, 5).map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">Rating {item.rating ?? "n/a"}</p>
                  <p className="mt-1 line-clamp-3 text-muted-foreground">
                    {item.feedback}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Button
          type="button"
          variant="outline"
          onClick={archive}
          disabled={archiving}
        >
          <Archive className="size-4" aria-hidden="true" />
          {archiving ? "Archiving" : "Archive update"}
        </Button>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
