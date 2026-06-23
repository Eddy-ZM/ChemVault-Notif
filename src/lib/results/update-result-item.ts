import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ExtractionResult,
  ResultItem,
  ResultItemStatus,
  ResultReviewAction,
  UpdateExtractionResultItemInput,
  UpdateResultItemInput,
} from "@/types/results";
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
    | "insertCorrection"
    | "insertReview"
    | "isProjectMember"
    | "updateResult"
    | "updateResultItem"
  >;
}

export async function updateResultItem(
  input: UpdateResultItemInput | UpdateExtractionResultItemInput,
  dependencies: UpdateResultItemDependencies = {}
): Promise<ResultItem> {
  const normalized = normalizeInput(input);
  const store = dependencies.store ?? createSupabaseResultStore();
  const item = await store.getResultItem(normalized.resultItemId);

  if (!item) {
    throw new NotificationError("Result item not found.", undefined, 404);
  }

  const result = await store.getResult(item.resultId);
  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertCanReview({ result, reviewerId: normalized.reviewerId, store });

  const reviewStartedAt = new Date().toISOString();
  if (result.status === "draft" || result.status === "ready_for_review") {
    await store.updateResult(result.id, {
      status: "in_review",
      reviewedBy: normalized.reviewerId,
      reviewedAt: reviewStartedAt,
    });
    await store.insertReview({
      resultId: result.id,
      reviewerId: normalized.reviewerId,
      action: "started_review",
      metadata: {
        resultId: result.id,
        previousStatus: result.status,
        status: "in_review",
      },
    });
  }

  const nextValue = normalized.newValue === undefined ? item.value : normalized.newValue;
  const valueChanged = !jsonEqual(item.value, nextValue);
  const updatedItem = await store.updateResultItem(item.id, {
    value: nextValue,
    status: normalized.status,
    reviewerNote: normalized.reviewerNote,
  });

  if (valueChanged) {
    await store.insertCorrection({
      resultId: result.id,
      resultItemId: item.id,
      correctedBy: normalized.reviewerId,
      fieldPath: "value",
      oldValue: item.value,
      newValue: nextValue,
      reason: normalized.reason,
    });
  }

  const action = reviewActionForStatus(normalized.status, valueChanged);
  await store.insertReview({
    resultId: result.id,
    reviewerId: normalized.reviewerId,
    action,
    note: normalized.reviewerNote,
    metadata: {
      resultId: result.id,
      itemId: item.id,
      itemType: item.itemType,
      previousStatus: item.status,
      status: normalized.status,
      valueChanged,
      reason: normalized.reason ?? null,
    },
  });

  await logItemReview({
    result,
    item: updatedItem,
    previousStatus: item.status,
    reviewerId: normalized.reviewerId,
    action,
    valueChanged,
  });

  return updatedItem;
}

function normalizeInput(
  input: UpdateResultItemInput | UpdateExtractionResultItemInput
): UpdateResultItemInput {
  const resultItemId =
    "resultItemId" in input && input.resultItemId
      ? input.resultItemId.trim()
      : "itemId" in input && input.itemId
        ? input.itemId.trim()
        : "";
  const reviewerId =
    "reviewerId" in input && input.reviewerId
      ? input.reviewerId.trim()
      : "userId" in input && input.userId
        ? input.userId.trim()
        : "";
  const status = normalizeItemStatus(input.status);

  if (!resultItemId) {
    throw new NotificationError("resultItemId is required.", undefined, 400);
  }

  if (!reviewerId) {
    throw new NotificationError("reviewerId is required.", undefined, 400);
  }

  return {
    resultItemId,
    reviewerId,
    status,
    newValue:
      "newValue" in input && input.newValue !== undefined
        ? input.newValue
        : "value" in input
          ? input.value
          : undefined,
    reviewerNote:
      ("reviewerNote" in input
        ? input.reviewerNote
        : "comment" in input
          ? input.comment
          : null) ?? null,
    reason: ("reason" in input ? input.reason : null) ?? null,
  };
}

async function assertCanReview(input: {
  result: ExtractionResult;
  reviewerId: string;
  store: Pick<ResultStore, "isProjectMember">;
}) {
  if (
    input.result.userId === input.reviewerId ||
    (input.result.projectId &&
      (await input.store.isProjectMember(
        input.result.projectId,
        input.reviewerId
      )))
  ) {
    return;
  }

  throw new NotificationError("Result review access required.", undefined, 403);
}

function normalizeItemStatus(status: ResultItemStatus | string): ResultItemStatus {
  if (!isExtractionResultItemStatus(status)) {
    throw new NotificationError(
      `Unsupported result item status: ${status}.`,
      undefined,
      400
    );
  }

  return status;
}

function reviewActionForStatus(
  status: ResultItemStatus,
  valueChanged: boolean
): ResultReviewAction {
  if (status === "accepted") {
    return "item_accepted";
  }

  if (status === "corrected" || valueChanged) {
    return "item_corrected";
  }

  if (status === "rejected") {
    return "item_rejected";
  }

  return "comment_added";
}

function jsonEqual(left: Json, right: Json | undefined): boolean {
  if (right === undefined) {
    return true;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

async function logItemReview(input: {
  result: ExtractionResult;
  item: ResultItem;
  previousStatus: ResultItemStatus;
  reviewerId: string;
  action: ResultReviewAction;
  valueChanged: boolean;
}) {
  const metadata = {
    resultId: input.result.id,
    taskId: input.result.taskId,
    fileId: input.result.fileId,
    projectId: input.result.projectId,
    itemId: input.item.id,
    reviewerId: input.reviewerId,
    itemType: input.item.itemType,
    previousStatus: input.previousStatus,
    status: input.item.status,
    valueChanged: input.valueChanged,
    confidenceScore: input.item.confidenceScore,
    modelName: input.result.modelName,
  } satisfies Record<string, Json>;
  const actionName = auditActionForReview(input.action);

  await logEvent({
    audit: {
      actorUserId: input.reviewerId,
      actorType: "user",
      action: actionName,
      entityType: "result_item",
      entityId: input.item.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "result-review",
      severity: input.action === "item_rejected" ? "warning" : "info",
      visibility: "admin",
      title: itemAuditTitle(input.action),
      metadata,
    },
    activity:
      input.result.projectId &&
      (input.action === "item_corrected" || input.action === "item_rejected")
        ? {
            projectId: input.result.projectId,
            actorUserId: input.reviewerId,
            actorType: "user",
            eventType: actionName,
            entityType: "result_item",
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

function auditActionForReview(action: ResultReviewAction): string {
  switch (action) {
    case "item_accepted":
      return "result.item_accepted";
    case "item_corrected":
      return "result.item_corrected";
    case "item_rejected":
      return "result.item_rejected";
    default:
      return "result.comment_added";
  }
}

function itemAuditTitle(action: ResultReviewAction) {
  switch (action) {
    case "item_accepted":
      return "Result item accepted";
    case "item_corrected":
      return "Result item corrected";
    case "item_rejected":
      return "Result item rejected";
    default:
      return "Result comment added";
  }
}

function itemActivityTitle(action: ResultReviewAction) {
  switch (action) {
    case "item_corrected":
      return "Item corrected";
    case "item_rejected":
      return "Item rejected";
    default:
      return "Result item reviewed";
  }
}
