import { NotificationError } from "@/lib/notifications/errors";
import type { BroadcastJson, BroadcastTargetType } from "@/types/broadcasts";
import { createSupabaseBroadcastStore } from "./broadcast-store";

export interface BroadcastRecipientResolverStore {
  getProjectMemberUserIds(projectId: string): Promise<string[]>;
  getSegmentMemberUserIds(segmentId: string): Promise<string[]>;
  getAllUserIds(): Promise<string[]>;
}

interface ResolveBroadcastRecipientsInput {
  targetType: BroadcastTargetType;
  targetPayload: BroadcastJson;
}

interface ResolveBroadcastRecipientsDependencies {
  store?: BroadcastRecipientResolverStore;
}

export async function resolveBroadcastRecipients(
  input: ResolveBroadcastRecipientsInput,
  dependencies: ResolveBroadcastRecipientsDependencies = {}
): Promise<string[]> {
  const store = dependencies.store ?? createSupabaseBroadcastStore();

  switch (input.targetType) {
    case "single_user":
      return uniqueValidUserIds([stringValue(input.targetPayload.userId)]);
    case "selected_users":
      return uniqueValidUserIds(arrayValue(input.targetPayload.userIds));
    case "project_members":
      return uniqueValidUserIds(
        await store.getProjectMemberUserIds(
          requiredPayloadString(input.targetPayload.projectId, "projectId")
        )
      );
    case "segment":
      return uniqueValidUserIds(
        await store.getSegmentMemberUserIds(
          requiredPayloadString(input.targetPayload.segmentId, "segmentId")
        )
      );
    case "all_users":
      if (input.targetPayload.confirmAllUsers !== true) {
        throw new NotificationError(
          "confirmAllUsers is required for all_users broadcasts.",
          undefined,
          400
        );
      }
      return uniqueValidUserIds(await store.getAllUserIds());
  }
}

export function uniqueValidUserIds(values: unknown[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => stringValue(value))
        .filter((value) => isValidUuid(value))
    ),
  ];
}

function requiredPayloadString(value: unknown, field: string): string {
  const result = stringValue(value);

  if (!result) {
    throw new NotificationError(`${field} is required.`, undefined, 400);
  }

  return result;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
