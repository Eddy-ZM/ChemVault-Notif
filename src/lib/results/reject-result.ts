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
  reviewerId?: string;
  userId?: string;
  note?: string | null;
  reason?: string | null;
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
  const reviewerId = (input.reviewerId ?? input.userId)?.trim();
  const note = (input.note ?? input.reason)?.trim();

  if (!resultId) {
    throw new NotificationError("resultId is required.", undefined, 400);
  }

  if (!reviewerId) {
    throw new NotificationError("reviewerId is required.", undefined, 400);
  }

  if (!note) {
    throw new NotificationError("note is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseResultStore();
  const result = await store.getResult(resultId);

  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertCanReview({ result, reviewerId, store });
  const rejectedAt = new Date().toISOString();
  const updated = await store.updateResult(result.id, {
    status: "rejected",
    reviewedBy: reviewerId,
    reviewedAt: result.reviewedAt ?? rejectedAt,
    rejectedBy: reviewerId,
    rejectedAt,
    rejectionReason: note,
    approvedBy: null,
    approvedAt: null,
  });

  await store.insertReview({
    resultId: result.id,
    reviewerId,
    action: "rejected",
    note,
    metadata: {
      resultId: result.id,
      previousStatus: result.status,
      status: "rejected",
      reasonProvided: true,
    },
  });

  await logResultRejection({
    result: updated,
    previousStatus: result.status,
    reviewerId,
  });
  await (dependencies.notifyFn ?? notify)({
    userId: result.userId,
    title: "Result rejected",
    body: "The extraction result has been rejected.",
    type: "warning",
    source: "result-review",
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

  throw new NotificationError("Extraction result rejection access required.", undefined, 403);
}

async function logResultRejection(input: {
  result: ExtractionResult;
  previousStatus: string;
  reviewerId: string;
}) {
  const metadata = {
    resultId: input.result.id,
    taskId: input.result.taskId,
    fileId: input.result.fileId,
    projectId: input.result.projectId,
    reviewerId: input.reviewerId,
    previousStatus: input.previousStatus,
    status: input.result.status,
    reasonProvided: true,
  };

  await logEvent({
    audit: {
      actorUserId: input.reviewerId,
      actorType: "user",
      action: "result.rejected",
      entityType: "extraction_result",
      entityId: input.result.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "result-review",
      severity: "warning",
      visibility: "admin",
      title: "Extraction result rejected",
      metadata,
    },
    activity: input.result.projectId
      ? {
          projectId: input.result.projectId,
          actorUserId: input.reviewerId,
          actorType: "user",
          eventType: "result.rejected",
          entityType: "extraction_result",
          entityId: input.result.id,
          title: "Result rejected",
          description: "The extraction result was rejected.",
          visibility: "project",
          severity: "warning",
          metadata,
        }
      : null,
  });
}
