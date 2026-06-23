import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { ExtractionResult } from "@/types/extraction-results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";

interface RejectResultInput {
  resultId: string;
  userId: string;
  reason: string;
}

interface RejectResultDependencies {
  store?: Pick<
    ResultStore,
    "getResult" | "insertReview" | "isProjectMember" | "updateResult"
  >;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
}

export async function rejectResult(
  input: RejectResultInput,
  dependencies: RejectResultDependencies = {}
): Promise<ExtractionResult> {
  const resultId = input.resultId?.trim();
  const userId = input.userId?.trim();
  const reason = input.reason?.trim();

  if (!resultId) {
    throw new NotificationError("resultId is required.", undefined, 400);
  }

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  if (!reason) {
    throw new NotificationError("reason is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseResultStore();
  const result = await store.getResult(resultId);

  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertCanReview({ result, userId, store });
  const rejectedAt = new Date().toISOString();
  const updated = await store.updateResult(result.id, {
    status: "rejected",
    reviewedBy: userId,
    reviewedAt: result.reviewedAt ?? rejectedAt,
    rejectedBy: userId,
    rejectedAt,
    rejectionReason: reason,
    approvedBy: null,
    approvedAt: null,
  });

  await store.insertReview({
    resultId: result.id,
    reviewerId: userId,
    action: "result_rejected",
    comment: reason,
    changes: {
      resultId: result.id,
      previousStatus: result.status,
      status: "rejected",
      reasonProvided: true,
    },
  });

  await logResultRejection({ result: updated, previousStatus: result.status, userId });
  await (dependencies.notifyFn ?? notify)({
    userId: result.userId,
    title: "Extraction result rejected",
    body: "The extracted data was rejected and requires reprocessing.",
    type: "warning",
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

  throw new NotificationError("Extraction result rejection access required.", undefined, 403);
}

async function logResultRejection(input: {
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
    reasonProvided: true,
  };

  await logEvent({
    audit: {
      actorUserId: input.userId,
      actorType: "user",
      action: "extraction_result.rejected",
      entityType: "extraction_result",
      entityId: input.result.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "chemvault-results",
      severity: "warning",
      visibility: "admin",
      title: "Extraction result rejected",
      metadata,
    },
    activity: input.result.projectId
      ? {
          projectId: input.result.projectId,
          actorUserId: input.userId,
          actorType: "user",
          eventType: "extraction_result.rejected",
          entityType: "extraction_result",
          entityId: input.result.id,
          title: "Result rejected",
          description: "The extracted data was rejected and requires reprocessing.",
          visibility: "project",
          severity: "warning",
          metadata,
        }
      : null,
  });
}
