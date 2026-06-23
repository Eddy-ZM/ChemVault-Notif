"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Loader2, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { isPushSupported } from "@/lib/notifications/push-client";
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PREFERENCE_CATEGORY_DESCRIPTIONS,
  NOTIFICATION_PREFERENCE_CATEGORY_LABELS,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPreferencesMap,
} from "@/types/notification-preferences";
import type { UserNotificationPreference } from "@/types/notification-preferences";

interface ServerPreferenceResponse {
  preferences: NotificationPreferencesMap;
}

interface ServerPreferenceUpdate {
  preference: UserNotificationPreference;
}

type SavingKey = `${NotificationCategory}-${NotificationChannel}`;

export function NotificationPreferencesPanel() {
  const [preferences, setPreferences] = useState<NotificationPreferencesMap | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const isPushAllowed = useSyncExternalStore(
    subscribeToStaticPushSupport,
    isPushSupported,
    () => false
  );

  const anySaving = useMemo(
    () => loading || resetting || savingKeys.size > 0,
    [loading, resetting, savingKeys.size]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/notification-preferences", {
          credentials: "same-origin",
        });

        if (!response.ok) {
          throw new Error(
            response.status === 401
              ? "Sign in to manage notification preferences."
              : "Unable to load preferences."
          );
        }

        const data = (await response.json()) as ServerPreferenceResponse;

        if (!cancelled) {
          setPreferences(data.preferences);
          setError(null);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Unable to load preferences."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  const togglePreference = useCallback(
    async (
      category: NotificationCategory,
      channel: NotificationChannel,
      enabled: boolean
    ) => {
      if (!preferences) {
        return;
      }

      const key: SavingKey = `${category}-${channel}`;
      setSavingKeys((current) => new Set(current).add(key));
      setError(null);

      try {
        const response = await fetch("/api/notification-preferences", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            category,
            channel,
            enabled,
          }),
        });

        const data = (await response.json()) as ServerPreferenceUpdate & {
          error?: string;
        };

        if (!response.ok || !data.preference) {
          throw new Error(data.error || "Unable to save preference.");
        }

        setPreferences((current) => {
          if (!current) {
            return current;
          }

          const currentCategory = current[data.preference.category];

          if (!currentCategory) {
            return current;
          }

          return {
            ...current,
            [data.preference.category]: {
              ...currentCategory,
              [data.preference.channel]: {
                ...currentCategory[data.preference.channel],
                enabled: data.preference.enabled,
                source: "user",
              },
            },
          };
        });

        toast.success("Notification preference saved.");
      } catch (saveError) {
        const message =
          saveError instanceof Error
            ? saveError.message
            : "Unable to save preference.";
        setError(message);
        toast.error(message);
      } finally {
        setSavingKeys((current) => {
          const next = new Set(current);
          next.delete(key);
          return next;
        });
      }
    },
    [preferences]
  );

  const resetPreferences = useCallback(async () => {
    setResetting(true);
    setError(null);

    try {
      const response = await fetch("/api/notification-preferences/reset", {
        method: "POST",
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error("Unable to reset preferences.");
      }

      const data = (await response.json()) as ServerPreferenceResponse;
      setPreferences(data.preferences);
      toast.success("Preferences reset to defaults.");
    } catch (resetError) {
      const message =
        resetError instanceof Error
          ? resetError.message
          : "Unable to reset preferences.";
      setError(message);
      toast.error(message);
    } finally {
      setResetting(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Notification preferences</CardTitle>
            <CardDescription>
              Control where and how ChemVault notifications are delivered.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={resetPreferences}
            disabled={anySaving || !preferences}
          >
            {resetting ? <Loader2 className="animate-spin" /> : null}
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset defaults
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="grid gap-3">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="rounded-md border p-3">
                <Skeleton className="mb-3 h-4 w-36" />
                <Skeleton className="mb-2 h-3 w-52" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : error ? (
          <StateMessage title="Unable to load preferences" description={error} />
        ) : !preferences ? (
          <StateMessage
            title="No preferences found"
            description="Try refreshing this page to load your notification settings."
          />
        ) : (
          <>
            {isPushAllowed ? null : (
              <p className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 flex items-start gap-2">
                <ShieldAlert className="mt-0.5 size-4" aria-hidden="true" />
                Browser push is not supported in this environment. System
                notifications will remain unavailable, but in-app notifications
                still work.
              </p>
            )}

            <ScrollArea className="h-[580px]">
              <div className="grid gap-3 pr-3">
                {NOTIFICATION_CATEGORIES.map((category) => {
                  const categoryStates = preferences[category];

                  if (!categoryStates) {
                    return null;
                  }

                  return (
                    <div key={category} className="rounded-md border p-3">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">
                            {NOTIFICATION_PREFERENCE_CATEGORY_LABELS[category]}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {
                              NOTIFICATION_PREFERENCE_CATEGORY_DESCRIPTIONS[
                                category
                              ]
                            }
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant={
                              categoryStates.in_app.source === "default"
                                ? "secondary"
                                : "default"
                            }
                          >
                            In-app
                          </Badge>
                          <Badge
                            variant={
                              categoryStates.web_push.source === "default"
                                ? "secondary"
                                : "default"
                            }
                          >
                            Web push
                          </Badge>
                        </div>
                      </div>

                      <Separator className="my-3" />

                      <div className="grid gap-3 md:grid-cols-2">
                        <PreferenceToggleRow
                          label="In-app"
                          checked={categoryStates.in_app.enabled}
                          disabled={
                            anySaving ||
                            savingKeys.has(`${category}-in_app`)
                          }
                          onChange={(value) =>
                            togglePreference(category, "in_app", value)
                          }
                        />

                        <PreferenceToggleRow
                          label="Web push"
                          checked={categoryStates.web_push.enabled}
                          disabled={
                            anySaving ||
                            savingKeys.has(`${category}-web_push`) ||
                            !isPushAllowed
                          }
                          onChange={(value) =>
                            togglePreference(category, "web_push", value)
                          }
                          note={
                            !isPushAllowed
                              ? "Browser push is not supported in this browser."
                              : undefined
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}

        <div className="text-xs text-muted-foreground">
          <p>
            Changes are saved automatically. In-app and push toggles can be
            changed independently per category.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function PreferenceToggleRow({
  label,
  checked,
  disabled,
  onChange,
  note,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
  note?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          disabled={disabled}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
            checked
              ? "bg-primary border-primary"
              : "bg-muted border-border"
          } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background shadow transition ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {note ? (
        <span className="text-xs text-muted-foreground">{note}</span>
      ) : null}
    </label>
  );
}

function StateMessage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      <p className="font-medium text-foreground">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

function subscribeToStaticPushSupport() {
  return () => {};
}
