import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { ExtractionResult } from "@/types/extraction-results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";

interface ApproveResultInput {
  resultId: string;
  userId: string;
  comment?: string | null;
}

interface ApproveResultDependencies {
  store?: Pick<
    ResultStore,
    | "getResult"
    | "insertReview"
    | "isProjectMember"
    | "listResultItems"
    | "updateResult"
  >;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
}

export async function approveResult(
  input: ApproveResultInput,
  dependencies: ApproveResultDependencies = {}
): Promise<ExtractionResult> {
  const resultId = input.resultId?.trim();
  const userId = input.userId?.trim();

  if (!resultId) {
    throw new NotificationError("resultId is required.", undefined, 400);
  }

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseResultStore();
  const result = await store.getResult(resultId);

  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertCanReview({ result, userId, store });
  const items = await store.listResultItems(result.id);
  const blockingItem = items.find(
    (item) => item.status === "pending" || item.status === "rejected"
  );

  if (blockingItem) {
    throw new NotificationError(
      "All result items must be accepted or corrected before approval.",
      undefined,
      400
    );
  }

  const approvedAt = new Date().toISOString();
  const updated = await store.updateResult(result.id, {
    status: "approved",
    reviewedBy: userId,
    reviewedAt: result.reviewedAt ?? approvedAt,
    approvedBy: userId,
    approvedAt,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  });

  await store.insertReview({
    resultId: result.id,
    reviewerId: userId,
    action: "result_approved",
    comment: normalizeComment(input.comment),
    changes: {
      resultId: result.id,
      previousStatus: result.status,
      status: "approved",
      reviewedItemCount: items.length,
    },
  });

  await logResultApproval({ result: updated, previousStatus: result.status, userId });
  await (dependencies.notifyFn ?? notify)({
    userId: result.userId,
    title: "Extraction result approved",
    body: "The reviewed data has been approved.",
    type: "success",
    source: "ai-extractor",
    link: result.projectId
      ? `/projects/${result.projectId}/results/${result.id}`
      : `/results/${result.id}`,
    metadata: {
      resultId: result.id,
      taskId: result.taskId,
      fileId: result.fileId,
      projectId: result.projectId,
      pushPreviewAllowed: false,
    },
  });

  return updated;
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

  throw new NotificationError("Extraction result approval access required.", undefined, 403);
}

function normalizeComment(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function logResultApproval(input: {
  result: ExtractionResult;
  previousStatus: string;
  userId: string;
}) {
  const metadata = {
    resultId: input.result.id,
    taskId: input.result.taskId,
    fileId: input.result.fileId,
    projectId: input.result.projectId,
    previousStatus: input.previousStatus,
    status: input.result.status,
  };

  await logEvent({
    audit: {
      actorUserId: input.userId,
      actorType: "user",
      action: "extraction_result.approved",
      entityType: "extraction_result",
      entityId: input.result.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "chemvault-results",
      severity: "success",
      visibility: "admin",
      title: "Extraction result approved",
      metadata,
    },
    activity: input.result.projectId
      ? {
          projectId: input.result.projectId,
          actorUserId: input.userId,
          actorType: "user",
          eventType: "extraction_result.approved",
          entityType: "extraction_result",
          entityId: input.result.id,
          title: "Result approved",
          description: "The reviewed extraction result was approved.",
          visibility: "project",
          severity: "success",
          metadata,
        }
      : null,
  });
}
