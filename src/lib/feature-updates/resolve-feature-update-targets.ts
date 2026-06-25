import { NotificationError } from "@/lib/notifications/errors";
import type {
  FeatureUpdateTarget,
  FeatureUpdateTargetType,
  FeatureUpdateVisibility,
} from "@/types/feature-updates";
import {
  createSupabaseFeatureUpdateStore,
  type FeatureUpdateStore,
} from "./feature-update-store";

export interface ResolveFeatureUpdateRecipientsInput {
  visibility: FeatureUpdateVisibility;
  targets: FeatureUpdateTarget[];
  confirmAllUsers?: boolean;
}

export async function resolveFeatureUpdateRecipients(
  input: ResolveFeatureUpdateRecipientsInput,
  dependencies: { store?: FeatureUpdateStore } = {}
): Promise<string[]> {
  const store = dependencies.store ?? createSupabaseFeatureUpdateStore();

  if (input.visibility === "admin_only") {
    return uniqueUserIds(await store.getAdminUserIds());
  }

  if (input.visibility === "public" || input.visibility === "authenticated") {
    if (input.confirmAllUsers !== true) {
      throw new NotificationError(
        "confirmAllUsers is required before notifying all users.",
        undefined,
        400
      );
    }

    return uniqueUserIds(await store.getAllUserIds());
  }

  if (input.visibility !== "targeted") {
    return [];
  }

  if (input.targets.length === 0) {
    throw new NotificationError(
      "At least one target is required for targeted feature updates.",
      undefined,
      400
    );
  }

  const recipientGroups = await Promise.all(
    input.targets.map((target) =>
      resolveTargetRecipients({
        targetType: target.targetType,
        targetPayload: target.targetPayload,
        confirmAllUsers: input.confirmAllUsers,
        store,
      })
    )
  );

  return uniqueUserIds(recipientGroups.flat());
}

async function resolveTargetRecipients(input: {
  targetType: FeatureUpdateTargetType;
  targetPayload: Record<string, unknown>;
  confirmAllUsers?: boolean;
  store: FeatureUpdateStore;
}): Promise<string[]> {
  switch (input.targetType) {
    case "all_users":
      if (input.confirmAllUsers !== true) {
        throw new NotificationError(
          "confirmAllUsers is required before notifying all users.",
          undefined,
          400
        );
      }
      return input.store.getAllUserIds();
    case "selected_users":
      return uniqueUserIds(arrayValue(input.targetPayload.userIds));
    case "project_members":
      return input.store.getProjectMemberUserIds(
        requiredString(input.targetPayload.projectId, "projectId")
      );
    case "segment":
      return input.store.getSegmentMemberUserIds(
        requiredString(input.targetPayload.segmentId, "segmentId")
      );
    case "admins":
      return input.store.getAdminUserIds();
    case "beta_users":
      return uniqueUserIds([
        ...arrayValue(input.targetPayload.userIds),
        ...(await input.store.getBetaUserIds()),
      ]);
  }
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function requiredString(value: unknown, field: string): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  throw new NotificationError(`${field} is required.`, undefined, 400);
}

function uniqueUserIds(values: unknown[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => (typeof value === "string" ? value.trim() : ""))
        .filter(isValidUuid)
    ),
  ];
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
