"use client";

import { useState } from "react";
import { CircleHelp, MinusCircle, Sparkles, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FeatureUpdateReaction } from "@/types/feature-updates";

const reactions: Array<{
  value: FeatureUpdateReaction;
  label: string;
  icon: typeof ThumbsUp;
}> = [
  { value: "useful", label: "Useful", icon: ThumbsUp },
  { value: "excited", label: "Excited", icon: Sparkles },
  { value: "confused", label: "Confusing", icon: CircleHelp },
  { value: "not_relevant", label: "Not relevant", icon: MinusCircle },
];

export function FeatureUpdateReactionBar({
  updateId,
  initialReaction,
}: {
  updateId: string;
  initialReaction?: FeatureUpdateReaction | null;
}) {
  const [selected, setSelected] = useState<FeatureUpdateReaction | null>(
    initialReaction ?? null
  );
  const [saving, setSaving] = useState<FeatureUpdateReaction | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submitReaction(reaction: FeatureUpdateReaction) {
    setSaving(reaction);
    setError(null);

    try {
      const response = await fetch(`/api/feature-updates/${updateId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ reaction }),
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      setSelected(reaction);
    } catch (reactionError) {
      setError(
        reactionError instanceof Error
          ? reactionError.message
          : "Unable to save reaction."
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {reactions.map((reaction) => {
          const Icon = reaction.icon;
          return (
            <Button
              key={reaction.value}
              type="button"
              variant={selected === reaction.value ? "default" : "outline"}
              size="sm"
              onClick={() => submitReaction(reaction.value)}
              disabled={Boolean(saving)}
              className={cn("gap-2", saving === reaction.value && "opacity-80")}
            >
              <Icon className="size-4" aria-hidden="true" />
              {reaction.label}
            </Button>
          );
        })}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

async function errorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string; detail?: string };
    return body.error ?? body.detail ?? response.statusText;
  } catch {
    return response.statusText;
  }
}
