"use client";

import { useState } from "react";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { UserSegmentMember } from "@/types/broadcasts";

interface UserSegmentDetailPanelProps {
  segmentId: string;
  initialMembers: UserSegmentMember[];
}

export function UserSegmentDetailPanel({
  segmentId,
  initialMembers,
}: UserSegmentDetailPanelProps) {
  const [members, setMembers] = useState(initialMembers);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addMembers(formData: FormData) {
    setWorking(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/user-segments/${segmentId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            userIds: textValue(formData, "userIds"),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      const data = (await response.json()) as { members: UserSegmentMember[] };
      setMembers((current) => mergeMembers(current, data.members));
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Unable to add members."
      );
    } finally {
      setWorking(false);
    }
  }

  async function removeMember(userId: string) {
    setWorking(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/user-segments/${segmentId}/members`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ userIds: [userId] }),
        }
      );

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      setMembers((current) =>
        current.filter((member) => member.userId !== userId)
      );
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove member."
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[24rem_1fr]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="size-4" aria-hidden="true" />
            Add members
          </CardTitle>
          <CardDescription>
            Paste Supabase user IDs or email addresses, one per line or comma-separated.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addMembers} className="grid gap-4">
            <Textarea
              name="userIds"
              className="min-h-32 font-mono text-xs"
              placeholder={"00000000-0000-4000-8000-000000000000\nreviewer@chemvault.science"}
            />
            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <Button type="submit" disabled={working}>
              {working ? <Loader2 className="animate-spin" /> : null}
              Add members
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>{members.length} users in this segment</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {members.length === 0 ? (
            <p className="rounded-md border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
              This segment has no members.
            </p>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-md border bg-card p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <code className="break-all text-xs">{member.userId}</code>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Added {formatDate(member.createdAt)}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={working}
                  onClick={() => removeMember(member.userId)}
                >
                  <Trash2 data-icon="inline-start" />
                  Remove
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function mergeMembers(
  current: UserSegmentMember[],
  next: UserSegmentMember[]
): UserSegmentMember[] {
  const byUserId = new Map(current.map((member) => [member.userId, member]));

  for (const member of next) {
    byUserId.set(member.userId, member);
  }

  return [...byUserId.values()];
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
