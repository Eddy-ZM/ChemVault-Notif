import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ExtractionResult,
  ExtractionResultItem,
  ExtractionResultItemStatus,
  UpdateExtractionResultItemInput,
} from "@/types/extraction-results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";
import { isExtractionResultItemStatus } from "./transform";

interface UpdateResultItemDependencies {
  store?: Pick<
    ResultStore,
    | "getResult"
    | "getResultItem"
    | "insertReview"
    | "isProjectMember"
    | "updateResult"
    | "updateResultItem"
  >;
}

export async function updateResultItem(
  input: UpdateExtractionResultItemInput,
  dependencies: UpdateResultItemDependencies = {}
): Promise<ExtractionResultItem> {
  const userId = input.userId?.trim();
  const itemId = input.itemId?.trim();
  const status = normalizeItemStatus(input.status);

  if (!itemId) {
    throw new NotificationError("itemId is required.", undefined, 400);
  }

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseResultStore();
  const item = await store.getResultItem(itemId);

  if (!item) {
    throw new NotificationError("Extraction result item not found.", undefined, 404);
  }

  const result = await store.getResult(item.resultId);
  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertCanReview({ result, userId, store });
  const reviewedAt = new Date().toISOString();

  if (result.status === "draft" || result.status === "ready_for_review") {
    await store.updateResult(result.id, {
      status: "in_review",
      reviewedBy: userId,
      reviewedAt,
    });
    await store.insertReview({
      resultId: result.id,
      reviewerId: userId,
      action: "review_started",
      changes: {
        resultId: result.id,
        previousStatus: result.status,
        status: "in_review",
      },
    });
  }

  const updatedItem = await store.updateResultItem(item.id, {
    value: input.value === undefined ? item.value : input.value,
    status,
    reviewedBy: userId,
    reviewedAt,
  });

  const action = reviewActionForStatus(status);
  await store.insertReview({
    resultId: result.id,
    reviewerId: userId,
    action,
    comment: normalizeComment(input.comment),
    changes: {
      resultId: result.id,
      itemId: item.id,
      itemType: item.itemType,
      previousStatus: item.status,
      status,
      valueChanged: input.value !== undefined,
    },
  });

  await logItemReview({
    result,
    item: updatedItem,
    previousStatus: item.status,
    reviewerId: userId,
    action,
  });

  return updatedItem;
}

async function assertCanReview(input: {
  result: ExtractionResult;
  userId: string;
  store: Pick<ResultStore, "isProjectMember">;
}) {
  if (
    input.result.userId === input.userId ||
    (input.result.projectId &&
      (await input.store.isProjectMember(input.result.projectId, input.userId)))
  ) {
    return;
  }

  throw new NotificationError("Extraction result review access required.", undefined, 403);
}

function normalizeItemStatus(
  status: ExtractionResultItemStatus | string
): ExtractionResultItemStatus {
  if (!isExtractionResultItemStatus(status)) {
    throw new NotificationError(
      `Unsupported extraction result item status: ${status}.`,
      undefined,
      400
    );
  }

  return status;
}

function reviewActionForStatus(status: ExtractionResultItemStatus) {
  switch (status) {
    case "accepted":
      return "item_accepted";
    case "corrected":
      return "item_corrected";
    case "rejected":
      return "item_rejected";
    default:
      throw new NotificationError(
        "Use accepted, corrected, or rejected when reviewing an item.",
        undefined,
        400
      );
  }
}

function normalizeComment(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function logItemReview(input: {
  result: ExtractionResult;
  item: ExtractionResultItem;
  previousStatus: ExtractionResultItemStatus;
  reviewerId: string;
  action: "item_accepted" | "item_corrected" | "item_rejected";
}) {
  const metadata = {
    resultId: input.result.id,
    taskId: input.result.taskId,
    fileId: input.result.fileId,
    projectId: input.result.projectId,
    itemId: input.item.id,
    itemType: input.item.itemType,
    previousStatus: input.previousStatus,
    status: input.item.status,
  } satisfies Record<string, Json>;

  await logEvent({
    audit: {
      actorUserId: input.reviewerId,
      actorType: "user",
      action: `extraction_result.${input.action}`,
      entityType: "extraction_result_item",
      entityId: input.item.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "chemvault-results",
      severity: input.action === "item_rejected" ? "warning" : "info",
      visibility: "admin",
      title: itemAuditTitle(input.action),
      metadata,
    },
    activity:
      input.result.projectId && input.action !== "item_accepted"
        ? {
            projectId: input.result.projectId,
            actorUserId: input.reviewerId,
            actorType: "user",
            eventType: `extraction_result.${input.action}`,
            entityType: "extraction_result_item",
            entityId: input.item.id,
            title: itemActivityTitle(input.action),
            description: `${input.item.label ?? "Extraction item"} was reviewed.`,
            visibility: "project",
            severity: input.action === "item_rejected" ? "warning" : "info",
            metadata,
          }
        : null,
  });
}

function itemAuditTitle(
  action: "item_accepted" | "item_corrected" | "item_rejected"
) {
  switch (action) {
    case "item_accepted":
      return "Extraction result item accepted";
    case "item_corrected":
      return "Extraction result item corrected";
    case "item_rejected":
      return "Extraction result item rejected";
  }
}

function itemActivityTitle(
  action: "item_accepted" | "item_corrected" | "item_rejected"
) {
  switch (action) {
    case "item_accepted":
      return "Result item accepted";
    case "item_corrected":
      return "Result item corrected";
    case "item_rejected":
      return "Result item rejected";
  }
}
