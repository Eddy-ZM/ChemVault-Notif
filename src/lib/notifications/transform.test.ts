import { describe, expect, it } from "vitest";
import {
  isNotificationType,
  notificationTypes,
  toChemVaultNotification,
} from "./transform";
import type { NotificationRow } from "@/lib/supabase/database.types";

describe("notification type helpers", () => {
  it("accepts the supported notification types", () => {
    expect(notificationTypes).toEqual([
      "info",
      "success",
      "warning",
      "error",
      "message",
      "system",
      "task",
    ]);
    expect(isNotificationType("success")).toBe(true);
    expect(isNotificationType("system")).toBe(true);
  });

  it("rejects unknown notification types", () => {
    expect(isNotificationType("billing")).toBe(false);
    expect(isNotificationType("")).toBe(false);
  });
});

describe("toChemVaultNotification", () => {
  it("maps a Supabase row into the public camelCase notification model", () => {
    const row: NotificationRow = {
      id: "9c7f954f-44e2-4a4b-a50d-ad2590a164d2",
      user_id: "7ec7ffef-31b0-4e4d-b226-a8f7355f1f28",
      title: "Extraction completed",
      body: "Your paper has been converted into structured data.",
      type: "success",
      source: "ai-extractor",
      link: "/projects/project-1/results",
      read: false,
      metadata: {
        projectId: "project-1",
        taskId: "task-1",
      },
      created_at: "2026-06-22T03:12:00.000Z",
    };

    expect(toChemVaultNotification(row)).toEqual({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      body: row.body,
      type: "success",
      source: row.source,
      link: row.link,
      read: false,
      metadata: row.metadata,
      createdAt: row.created_at,
    });
  });
});
