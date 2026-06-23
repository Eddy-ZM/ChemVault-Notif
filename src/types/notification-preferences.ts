export const NOTIFICATION_CHANNELS = ["in_app", "web_push"] as const;
export const NOTIFICATION_CATEGORIES = [
  "task_updates",
  "task_completed",
  "task_failed",
  "project_messages",
  "admin_announcements",
  "system_alerts",
  "security",
  "billing",
  "marketing",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export interface UserNotificationPreference {
  id: string;
  userId: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferenceDefault {
  id: string;
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
  description: string | null;
  createdAt: string;
}

export type NotificationPreferenceValue = {
  enabled: boolean;
  source: "user" | "default";
};

export type NotificationPreferencesMap = {
  [category in NotificationCategory]: {
    [channel in NotificationChannel]: NotificationPreferenceValue;
  };
};

export type NotificationPreferenceDefaultsMap = {
  [category in NotificationCategory]: { [channel in NotificationChannel]: boolean };
};

export interface NotificationPreferenceInput {
  category: NotificationCategory;
  channel: NotificationChannel;
  enabled: boolean;
}

export const NOTIFICATION_PREFERENCE_CATEGORY_LABELS: Record<
  NotificationCategory,
  string
> = {
  task_updates: "Task progress updates",
  task_completed: "Completed tasks",
  task_failed: "Failed tasks",
  project_messages: "Project messages",
  admin_announcements: "Admin announcements",
  system_alerts: "System alerts",
  security: "Security notifications",
  billing: "Billing notifications",
  marketing: "Product updates and marketing",
};

export const NOTIFICATION_PREFERENCE_CATEGORY_DESCRIPTIONS: Record<
  NotificationCategory,
  string
> = {
  task_updates: "Updates while AI tasks are running.",
  task_completed: "Notifications when a task finishes successfully.",
  task_failed: "Notifications when a task fails or needs attention.",
  project_messages: "Messages from project conversations.",
  admin_announcements: "Announcements from ChemVault admins.",
  system_alerts: "Important platform updates and maintenance notices.",
  security: "Account and security-related notifications.",
  billing: "Subscription and payment-related notifications.",
  marketing: "Product updates, feature launches, and promotional messages.",
};

export const NOTIFICATION_PREFERENCE_DEFAULTS: Record<
  NotificationCategory,
  Record<NotificationChannel, boolean>
> = {
  task_updates: { in_app: true, web_push: false },
  task_completed: { in_app: true, web_push: true },
  task_failed: { in_app: true, web_push: true },
  project_messages: { in_app: true, web_push: true },
  admin_announcements: { in_app: true, web_push: true },
  system_alerts: { in_app: true, web_push: true },
  security: { in_app: true, web_push: true },
  billing: { in_app: true, web_push: true },
  marketing: { in_app: true, web_push: false },
};
