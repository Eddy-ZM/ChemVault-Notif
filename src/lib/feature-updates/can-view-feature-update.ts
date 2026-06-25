import type {
  FeatureUpdate,
  FeatureUpdateTarget,
} from "@/types/feature-updates";
import {
  createSupabaseFeatureUpdateStore,
  type FeatureUpdateStore,
} from "./feature-update-store";

export async function canViewFeatureUpdate(input: {
  userId?: string | null;
  updateId?: string;
  update?: FeatureUpdate;
  isAdmin?: boolean;
  store?: FeatureUpdateStore;
}): Promise<boolean> {
  const store = input.store ?? createSupabaseFeatureUpdateStore();
  const update =
    input.update ??
    (input.updateId ? await store.getUpdate(input.updateId) : null);

  if (!update) {
    return false;
  }

  if (input.isAdmin) {
    return true;
  }

  if (update.status !== "published") {
    return false;
  }

  if (update.visibility === "public") {
    return true;
  }

  const userId = input.userId?.trim();
  if (!userId) {
    return false;
  }

  if (update.visibility === "authenticated") {
    return true;
  }

  if (update.visibility === "admin_only") {
    return (await store.getAdminUserIds()).includes(userId);
  }

  if (update.visibility !== "targeted") {
    return false;
  }

  return canViewTargetedUpdate({
    userId,
    targets: await store.listTargets(update.id),
    store,
  });
}

async function canViewTargetedUpdate(input: {
  userId: string;
  targets: FeatureUpdateTarget[];
  store: FeatureUpdateStore;
}): Promise<boolean> {
  for (const target of input.targets) {
    switch (target.targetType) {
      case "all_users":
        return true;
      case "selected_users":
        if (stringArray(target.targetPayload.userIds).includes(input.userId)) {
          return true;
        }
        break;
      case "project_members":
        if (
          await isInResolvedUsers(
            input.userId,
            input.store.getProjectMemberUserIds(
              stringValue(target.targetPayload.projectId)
            )
          )
        ) {
          return true;
        }
        break;
      case "segment":
        if (
          await isInResolvedUsers(
            input.userId,
            input.store.getSegmentMemberUserIds(
              stringValue(target.targetPayload.segmentId)
            )
          )
        ) {
          return true;
        }
        break;
      case "admins":
        if (await isInResolvedUsers(input.userId, input.store.getAdminUserIds())) {
          return true;
        }
        break;
      case "beta_users":
        if (
          stringArray(target.targetPayload.userIds).includes(input.userId) ||
          (await isInResolvedUsers(input.userId, input.store.getBetaUserIds()))
        ) {
          return true;
        }
        break;
    }
  }

  return false;
}

async function isInResolvedUsers(
  userId: string,
  userIdsPromise: Promise<string[]>
): Promise<boolean> {
  try {
    return (await userIdsPromise).includes(userId);
  } catch {
    return false;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}
