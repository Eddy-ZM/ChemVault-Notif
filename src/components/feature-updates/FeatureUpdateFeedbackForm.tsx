"use client";

import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function FeatureUpdateFeedbackForm({ updateId }: { updateId: string }) {
  const [feedback, setFeedback] = useState("");
  const [rating, setRating] = useState("5");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submitFeedback() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/feature-updates/${updateId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          feedback,
          rating: Number(rating),
        }),
      });

      if (!response.ok) {
        throw new Error(await errorMessage(response));
      }

      setFeedback("");
      setRating("5");
      setSuccess(true);
    } catch (feedbackError) {
      setError(
        feedbackError instanceof Error
          ? feedbackError.message
          : "Unable to submit feedback."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm font-medium">Feedback</p>
      </div>
      <Textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        placeholder="Tell the ChemVault team what is useful, confusing, or missing."
        className="min-h-28"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Rating</span>
          <select
            value={rating}
            onChange={(event) => setRating(event.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="5">5</option>
            <option value="4">4</option>
            <option value="3">3</option>
            <option value="2">2</option>
            <option value="1">1</option>
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          onClick={submitFeedback}
          disabled={saving || feedback.trim().length === 0}
        >
          <Send className="size-4" aria-hidden="true" />
          {saving ? "Sending" : "Send feedback"}
        </Button>
      </div>
      {success ? (
        <p className="text-sm text-emerald-700">Feedback submitted.</p>
      ) : null}
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
