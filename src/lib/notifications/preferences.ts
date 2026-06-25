import type { SupabaseClient } from "@supabase/supabase-js";
import { NotificationError } from "@/lib/notifications/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  NotificationPreferenceDefaultRow,
  UserNotificationPreferenceRow,
} from "@/lib/supabase/database.types";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_PREFERENCE_CATEGORY_DESCRIPTIONS,
  NOTIFICATION_PREFERENCE_CATEGORY_LABELS,
  NOTIFICATION_PREFERENCE_DEFAULTS,
  type NotificationChannel,
  type NotificationCategory,
  type NotificationPreferenceInput,
  type NotificationPreferenceValue,
  type NotificationPreferencesMap,
  type UserNotificationPreference,
} from "@/types/notification-preferences";
import type { NotificationPayload } from "@/lib/notifications/types";

const DEFAULT_PREFERENCES_MAP = NOTIFICATION_PREFERENCE_DEFAULTS;

interface PreferenceRowInput {
  user_id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

interface NotificationDefaultPreferenceRow {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

export interface EffectivePreferenceResult {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  source: "default" | "user";
}

export async function getUserNotificationPreferences(
  userId: string
): Promise<NotificationPreferencesMap> {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const supabase = createSupabaseAdminClient();
  const defaults = await getAllDefaultPreferences(supabase);
  const userRows = await getUserPreferenceRows(supabase, normalizedUserId);
  const userLookup = new Map<string, boolean>();

  for (const row of userRows) {
    userLookup.set(`${row.category}:${row.channel}`, row.enabled);
  }

  const result: NotificationPreferencesMap = {} as NotificationPreferencesMap;

  for (const [category, channelDefaults] of Object.entries(
    DEFAULT_PREFERENCES_MAP
  ) as Array<[NotificationCategory, Record<NotificationChannel, boolean>]>) {
    const byChannel: Record<NotificationChannel, NotificationPreferenceValue> =
      {} as Record<NotificationChannel, NotificationPreferenceValue>;

    for (const channel of Object.keys(channelDefaults) as NotificationChannel[]) {
      const defaultEnabled =
        getDefaultBoolean(defaults, category, channel) ??
        channelDefaults[channel];
      const lookupKey = `${category}:${channel}`;
      const userValue = userLookup.get(lookupKey);

      byChannel[channel] = {
        enabled: typeof userValue === "boolean" ? userValue : defaultEnabled,
        source: typeof userValue === "boolean" ? "user" : "default",
      };
    }

    result[category] = byChannel;
  }

  return result;
}

export async function getNotificationPreference(input: {
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
}): Promise<boolean> {
  const preferences = await getUserNotificationPreferences(input.userId);
  const value = preferences[input.category]?.[input.channel];

  if (!value) {
    throw new NotificationError("Preference not found.", undefined, 500);
  }

  return value.enabled;
}

export async function setNotificationPreference(input: {
  userId: string;
} & NotificationPreferenceInput): Promise<UserNotificationPreference> {
  const { userId, category, channel, enabled } = input;

  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  if (!isValidCategory(category)) {
    throw new NotificationError("Invalid category.", undefined, 400);
  }

  if (!isValidChannel(channel)) {
    throw new NotificationError("Invalid channel.", undefined, 400);
  }

  if (typeof enabled !== "boolean") {
    throw new NotificationError("enabled is required.", undefined, 400);
  }

  if (isCriticalCategory(category) && !enabled) {
    const oppositeChannel = channel === "in_app" ? "web_push" : "in_app";
    const oppositeEnabled = await getNotificationPreference({
      userId: normalizedUserId,
      category,
      channel: oppositeChannel,
    });

    if (!oppositeEnabled) {
      throw new NotificationError(
        "Security and billing alerts cannot be fully disabled.",
        undefined,
        400
      );
    }
  }

  const supabase = createSupabaseAdminClient();
  const payload: PreferenceRowInput = {
    user_id: normalizedUserId,
    category,
    channel,
    enabled,
  };

  const { data, error } = await supabase
    .from("user_notification_preferences")
    .upsert(payload, {
      onConflict: "user_id,category,channel",
      ignoreDuplicates: false,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new NotificationError("Failed to save notification preference.");
  }

  return toUserNotificationPreference(data as UserNotificationPreferenceRow);
}

export async function ensureDefaultNotificationPreferences(
  userId: string
): Promise<void> {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const defaults = await getAllDefaultPreferences(createSupabaseAdminClient());
  const rows = defaults.map((item) => ({
    user_id: normalizedUserId,
    category: item.category,
    channel: item.channel,
    enabled: item.enabled,
  }));

  await upsertPreferences(rows);
}

export async function resetUserNotificationPreferences(
  userId: string
): Promise<void> {
  const normalizedUserId = userId?.trim();

  if (!normalizedUserId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("user_notification_preferences")
    .delete()
    .eq("user_id", normalizedUserId);

  if (error) {
    throw new NotificationError(
      "Failed to reset notification preferences.",
      error,
      500
    );
  }

  await ensureDefaultNotificationPreferences(normalizedUserId);
}

export function mapNotificationToCategory(
  notification: NotificationPayload
): NotificationCategory {
  const type = notification.type ?? "";
  const source = notification.source?.trim() ?? "";

  if ((source === "ai-extractor" || source === "chemvault-files") && type === "task") {
    return "task_updates";
  }

  if (
    (source === "ai-extractor" || source === "chemvault-files") &&
    type === "success"
  ) {
    return "task_completed";
  }

  if (
    (source === "ai-extractor" || source === "chemvault-files") &&
    type === "error"
  ) {
    return "task_failed";
  }

  if (type === "message" || source === "project-chat") {
    return "project_messages";
  }

  if (source === "product-updates") {
    const category =
      notification.metadata && typeof notification.metadata.category === "string"
        ? notification.metadata.category
        : "";

    switch (category) {
      case "new_feature":
      case "improvement":
      case "experimental":
        return "marketing";
      case "security":
        return "security";
      case "bug_fix":
      case "maintenance":
      case "breaking_change":
      case "deprecation":
        return "system_alerts";
      case "announcement":
        return "admin_announcements";
      default:
        return "system_alerts";
    }
  }

  if (source === "admin" || source.startsWith("admin-")) {
    return "admin_announcements";
  }

  if (source === "system") {
    return "system_alerts";
  }

  if (source === "security") {
    return "security";
  }

  if (source === "billing") {
    return "billing";
  }

  if (source === "marketing") {
    return "marketing";
  }

  return "system_alerts";
}

export function categoryLabel(category: NotificationCategory): string {
  return NOTIFICATION_PREFERENCE_CATEGORY_LABELS[category];
}

export function categoryDescription(category: NotificationCategory): string {
  return NOTIFICATION_PREFERENCE_CATEGORY_DESCRIPTIONS[category];
}

function isValidCategory(value: string): value is NotificationCategory {
  return (Object.keys(DEFAULT_PREFERENCES_MAP) as NotificationCategory[]).includes(
    value as NotificationCategory
  );
}

function isValidChannel(value: string): value is NotificationChannel {
  return (NOTIFICATION_CHANNELS as readonly string[]).includes(value);
}

function isCriticalCategory(category: NotificationCategory): boolean {
  return category === "security" || category === "billing";
}

function getDefaultBoolean(
  defaults: NotificationDefaultPreferenceRow[],
  category: NotificationCategory,
  channel: NotificationChannel
): boolean | null {
  const item = defaults.find(
    (entry) => entry.category === category && entry.channel === channel
  );

  return item ? item.enabled : null;
}

async function getAllDefaultPreferences(
  supabase: SupabaseClient<Database>
): Promise<NotificationDefaultPreferenceRow[]> {
  const { data, error } = await supabase
    .from("notification_preference_defaults")
    .select("*");

  if (error) {
    throw error;
  }

  if (data && data.length > 0) {
    return (data as NotificationPreferenceDefaultRow[]).map((row) => ({
      category: row.category as NotificationCategory,
      channel: row.channel as NotificationChannel,
      enabled: row.enabled,
    }));
  }

  return createMissingDefaultsFromConstants();
}

async function getUserPreferenceRows(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<UserNotificationPreferenceRow[]> {
  const { data, error } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return (data ?? []) as UserNotificationPreferenceRow[];
}

async function upsertPreferences(rows: PreferenceRowInput[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("user_notification_preferences").upsert(
    rows,
    {
      onConflict: "user_id,category,channel",
      ignoreDuplicates: false,
    }
  );

  if (error) {
    throw new NotificationError(
      "Failed to save notification preferences.",
      error,
      500
    );
  }
}

function createMissingDefaultsFromConstants(): NotificationDefaultPreferenceRow[] {
  const defaults: NotificationDefaultPreferenceRow[] = [];

  for (const [category, channelMap] of Object.entries(
    DEFAULT_PREFERENCES_MAP
  ) as Array<[NotificationCategory, Record<NotificationChannel, boolean>]>) {
    for (const channel of Object.keys(channelMap) as NotificationChannel[]) {
      defaults.push({
        category,
        channel,
        enabled: channelMap[channel],
      });
    }
  }

  return defaults;
}

function toUserNotificationPreference(
  row: UserNotificationPreferenceRow
): UserNotificationPreference {
  return {
    id: row.id,
    userId: row.user_id,
    category: row.category as NotificationCategory,
    channel: row.channel as NotificationChannel,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
