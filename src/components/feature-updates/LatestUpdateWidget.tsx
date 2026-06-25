"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { FeatureUpdate } from "@/types/feature-updates";
import { FeatureUpdateBadge } from "./FeatureUpdateBadge";

export function LatestUpdateWidget() {
  const [update, setUpdate] = useState<FeatureUpdate | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    let mounted = true;

    fetch("/api/feature-updates?unreadOnly=true&limit=1", {
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { updates?: FeatureUpdate[] } | null) => {
        if (mounted) {
          setUpdate(body?.updates?.[0] ?? null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Latest update</CardTitle>
          <CardDescription>Checking product update status.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!update) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Check className="size-4 text-emerald-700" aria-hidden="true" />
            Product updates
          </CardTitle>
          <CardDescription>No unread feature updates.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function dismissUpdate() {
    if (!update) {
      return;
    }

    setDismissing(true);

    try {
      await fetch(`/api/feature-updates/${update.id}/read`, {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      setUpdate(null);
      setDismissing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <FeatureUpdateBadge value={update.category} />
          {update.version ? (
            <span className="rounded-md border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {update.version}
            </span>
          ) : null}
        </div>
        <div>
          <CardTitle className="text-base">{update.title}</CardTitle>
          <CardDescription className="mt-1 leading-6">
            {update.summary}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link href={`/updates/${update.slug}` as Route}>
              View update
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={dismissUpdate}
            disabled={dismissing}
          >
            <Check className="size-4" aria-hidden="true" />
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
