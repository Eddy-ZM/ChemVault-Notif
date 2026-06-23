import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import type { ExtractionResult } from "@/types/results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";

interface StartReviewInput {
  resultId: string;
  reviewerId: string;
}

interface StartReviewDependencies {
  store?: Pick<
    ResultStore,
    "getResult" | "insertReview" | "isProjectMember" | "updateResult"
  >;
}

export async function startReview(
  input: StartReviewInput,
  dependencies: StartReviewDependencies = {}
): Promise<ExtractionResult> {
  const resultId = input.resultId?.trim();
  const reviewerId = input.reviewerId?.trim();

  if (!resultId) {
    throw new NotificationError("resultId is required.", undefined, 400);
  }

  if (!reviewerId) {
    throw new NotificationError("reviewerId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseResultStore();
  const result = await store.getResult(resultId);

  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertCanReview({ result, reviewerId, store });

  const reviewedAt = new Date().toISOString();
  const updated = await store.updateResult(result.id, {
    status: "in_review",
    reviewedBy: reviewerId,
    reviewedAt,
  });

  await store.insertReview({
    resultId: result.id,
    reviewerId,
    action: "started_review",
    metadata: {
      resultId: result.id,
      previousStatus: result.status,
      status: "in_review",
    },
  });

  await logEvent({
    audit: {
      actorUserId: reviewerId,
      actorType: "user",
      action: "result.review_started",
      entityType: "extraction_result",
      entityId: result.id,
      projectId: result.projectId,
      userId: result.userId,
      source: "result-review",
      severity: "info",
      visibility: "admin",
      title: "Result review started",
      metadata: auditMetadata(result, reviewerId),
    },
    activity: result.projectId
      ? {
          projectId: result.projectId,
          actorUserId: reviewerId,
          actorType: "user",
          eventType: "result.review_started",
          entityType: "extraction_result",
          entityId: result.id,
          title: "Review started",
          description: "Human validation started for an extraction result.",
          visibility: "project",
          severity: "info",
          metadata: auditMetadata(result, reviewerId),
        }
      : null,
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

  throw new NotificationError("Result review access required.", undefined, 403);
}

function auditMetadata(result: ExtractionResult, reviewerId: string) {
  return {
    resultId: result.id,
    taskId: result.taskId,
    fileId: result.fileId,
    projectId: result.projectId,
    reviewerId,
    confidenceScore: result.confidenceScore,
    modelName: result.modelName,
  };
}
