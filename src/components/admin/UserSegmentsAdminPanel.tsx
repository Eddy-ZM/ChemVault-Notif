"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";
import { useState } from "react";
import { Loader2, UsersRound } from "lucide-react";
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
import type { UserSegment } from "@/types/broadcasts";

interface UserSegmentsAdminPanelProps {
  initialSegments: Array<UserSegment & { memberCount: number }>;
}

export function UserSegmentsAdminPanel({
  initialSegments,
}: UserSegmentsAdminPanelProps) {
  const [segments, setSegments] = useState(initialSegments);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createSegment(formData: FormData) {
    setCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/user-segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: textValue(formData, "name"),
          description: textValue(formData, "description"),
          type: textValue(formData, "type") || "manual",
          criteria: {},
        }),
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const data = (await response.json()) as { segment: UserSegment };
      setSegments((current) => [{ ...data.segment, memberCount: 0 }, ...current]);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create segment."
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UsersRound className="size-4" aria-hidden="true" />
            Create segment
          </CardTitle>
          <CardDescription>
            Manual segments are explicit allowlists for broadcasts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createSegment} className="grid gap-4">
            <Field label="Name">
              <Input name="name" required placeholder="Extraction reviewers" />
            </Field>
            <Field label="Description">
              <Textarea name="description" className="min-h-24" />
            </Field>
            <Field label="Type">
              <select
                name="type"
                defaultValue="manual"
                className="h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="manual">manual</option>
                <option value="dynamic">dynamic</option>
              </select>
            </Field>
            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : null}
              Create segment
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">User segments</CardTitle>
          <CardDescription>{segments.length} segments configured</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {segments.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              No user segments have been created.
            </p>
          ) : (
            segments.map((segment) => (
              <Link
                key={segment.id}
                href={`/admin/user-segments/${segment.id}` as Route}
                className="rounded-md border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{segment.name}</p>
                      <Badge variant="secondary">{segment.type}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {segment.description || "No description"}
                    </p>
                  </div>
                  <Badge>{segment.memberCount} members</Badge>
                </div>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  Created {formatDate(segment.createdAt)}
                </p>
              </Link>
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
