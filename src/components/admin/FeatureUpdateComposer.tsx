"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Eye, Save } from "lucide-react";
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
  FeatureUpdate,
  FeatureUpdateCategory,
  FeatureUpdateTargetType,
  FeatureUpdateVisibility,
} from "@/types/feature-updates";

const categories: FeatureUpdateCategory[] = [
  "new_feature",
  "improvement",
  "bug_fix",
  "security",
  "maintenance",
  "breaking_change",
  "experimental",
  "deprecation",
  "announcement",
];

const visibilities: FeatureUpdateVisibility[] = [
  "public",
  "authenticated",
  "admin_only",
  "targeted",
];

const targetTypes: FeatureUpdateTargetType[] = [
  "all_users",
  "selected_users",
  "project_members",
  "segment",
  "admins",
  "beta_users",
];

export function FeatureUpdateComposer() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetType, setTargetType] =
    useState<FeatureUpdateTargetType>("all_users");
  const [preview, setPreview] = useState({
    title: "AI Result Review is now available",
    summary:
      "You can now review, correct, approve, and export AI-extracted scientific data.",
    content:
      "Use the result review workspace to inspect extracted scientific data before it becomes an approved dataset.",
  });

  const targetHelp = useMemo(() => targetHelpText(targetType), [targetType]);

  async function saveDraft(formData: FormData) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/feature-updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payloadFromForm(formData, targetType)),
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const data = (await response.json()) as { update: FeatureUpdate };
      router.push(`/admin/feature-updates/${data.update.id}` as Route);
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
    <form action={saveDraft} className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature update draft</CardTitle>
          <CardDescription>
            Publish product changes, release notes, and maintenance updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field label="Title">
            <Input
              name="title"
              required
              defaultValue={preview.title}
              onChange={(event) =>
                setPreview((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Summary">
            <Textarea
              name="summary"
              required
              className="min-h-20"
              defaultValue={preview.summary}
              onChange={(event) =>
                setPreview((current) => ({
                  ...current,
                  summary: event.target.value,
                }))
              }
            />
          </Field>
          <Field label="Content">
            <Textarea
              name="content"
              required
              className="min-h-48"
              defaultValue={preview.content}
              onChange={(event) =>
                setPreview((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
            />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Category">
              <select name="category" className="h-10 rounded-md border bg-background px-3 text-sm">
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Visibility">
              <select name="visibility" className="h-10 rounded-md border bg-background px-3 text-sm">
                {visibilities.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Version">
              <Input name="version" placeholder="v0.4.0" />
            </Field>
          </div>
          <Field label="Release date">
            <Input name="releaseDate" type="datetime-local" />
          </Field>
          <Separator />
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Target type">
              <select
                name="targetType"
                value={targetType}
                onChange={(event) =>
                  setTargetType(event.target.value as FeatureUpdateTargetType)
                }
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                {targetTypes.map((target) => (
                  <option key={target} value={target}>
                    {target.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={targetHelp.label}>
              <Input name="targetValue" placeholder={targetHelp.placeholder} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">{targetHelp.description}</p>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={saving} className="w-fit">
            <Save className="size-4" aria-hidden="true" />
            {saving ? "Saving" : "Save draft"}
          </Button>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Eye className="size-4" aria-hidden="true" />
            Preview
          </CardTitle>
          <CardDescription>Draft copy shown before publishing.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <h2 className="text-xl font-semibold tracking-normal">{preview.title}</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {preview.summary}
          </p>
          <p className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm leading-6">
            {preview.content}
          </p>
        </CardContent>
      </Card>
    </form>
  );
}

function payloadFromForm(formData: FormData, targetType: FeatureUpdateTargetType) {
  return {
    title: value(formData, "title"),
    summary: value(formData, "summary"),
    content: value(formData, "content"),
    category: value(formData, "category"),
    visibility: value(formData, "visibility"),
    version: value(formData, "version"),
    releaseDate: dateTimeValue(formData, "releaseDate"),
    targets: [
      {
        targetType,
        targetPayload: targetPayloadFromForm(formData, targetType),
      },
    ],
  };
}

function targetPayloadFromForm(
  formData: FormData,
  targetType: FeatureUpdateTargetType
) {
  const targetValue = value(formData, "targetValue");

  switch (targetType) {
    case "selected_users":
      return { userIds: splitValues(targetValue) };
    case "project_members":
      return { projectId: targetValue };
    case "segment":
      return { segmentId: targetValue };
    case "beta_users":
      return targetValue ? { userIds: splitValues(targetValue) } : {};
    default:
      return {};
  }
}

function targetHelpText(targetType: FeatureUpdateTargetType) {
  switch (targetType) {
    case "selected_users":
      return {
        label: "User IDs",
        placeholder: "uuid, uuid",
        description: "Comma-separated user IDs.",
      };
    case "project_members":
      return {
        label: "Project ID",
        placeholder: "project uuid",
        description: "Notifies members of the selected ChemVault project.",
      };
    case "segment":
      return {
        label: "Segment ID",
        placeholder: "segment uuid",
        description: "Uses the existing user segment membership table.",
      };
    case "beta_users":
      return {
        label: "Optional user IDs",
        placeholder: "uuid, uuid",
        description: "Includes beta users from auth metadata and optional user IDs.",
      };
    default:
      return {
        label: "Target value",
        placeholder: "not required",
        description: "No additional target payload is required.",
      };
  }
}

function value(formData: FormData, key: string): string {
  const entry = formData.get(key);
  return typeof entry === "string" ? entry.trim() : "";
}

function dateTimeValue(formData: FormData, key: string): string | null {
  const entry = value(formData, key);
  return entry ? new Date(entry).toISOString() : null;
}

function splitValues(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
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
