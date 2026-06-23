import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { ExtractionResult, ExtractionResultMetadata } from "@/types/results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";

interface RequestRerunInput {
  resultId: string;
  reviewerId?: string;
  userId?: string;
  note?: string | null;
  metadata?: ExtractionResultMetadata | null;
}

interface RequestRerunDependencies {
  store?: Pick<
    ResultStore,
    "getResult" | "insertReview" | "isProjectMember" | "updateResult"
  >;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
}

export async function requestRerun(
  input: RequestRerunInput,
  dependencies: RequestRerunDependencies = {}
): Promise<ExtractionResult> {
  const resultId = input.resultId?.trim();
  const reviewerId = (input.reviewerId ?? input.userId)?.trim();

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
  const updated = await store.updateResult(result.id, {
    status: "rerun_requested",
    reviewedBy: reviewerId,
    reviewedAt: result.reviewedAt ?? new Date().toISOString(),
    approvedAt: null,
    rejectedAt: null,
    metadata: {
      ...result.metadata,
      rerunRequestedAt: new Date().toISOString(),
      rerunNote: input.note ?? null,
      rerunMetadata: input.metadata ?? {},
    },
  });

  await store.insertReview({
    resultId: result.id,
    reviewerId,
    action: "rerun_requested",
    note: input.note ?? null,
    metadata: {
      resultId: result.id,
      taskId: result.taskId,
      fileId: result.fileId,
      projectId: result.projectId,
      previousStatus: result.status,
      status: "rerun_requested",
      ...(input.metadata ?? {}),
    },
  });

  await logResultRerunRequested({
    result: updated,
    previousStatus: result.status,
    reviewerId,
    metadata: input.metadata ?? {},
  });
  await (dependencies.notifyFn ?? notify)({
    userId: result.userId,
    title: "Rerun requested",
    body: "A new extraction run has been requested for this result.",
    type: "task",
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

  throw new NotificationError("Result rerun access required.", undefined, 403);
}

async function logResultRerunRequested(input: {
  result: ExtractionResult;
  previousStatus: string;
  reviewerId: string;
  metadata: ExtractionResultMetadata;
}) {
  const metadata = {
    resultId: input.result.id,
    taskId: input.result.taskId,
    fileId: input.result.fileId,
    projectId: input.result.projectId,
    reviewerId: input.reviewerId,
    previousStatus: input.previousStatus,
    status: input.result.status,
    ...input.metadata,
  };

  await logEvent({
    audit: {
      actorUserId: input.reviewerId,
      actorType: "user",
      action: "result.rerun_requested",
      entityType: "extraction_result",
      entityId: input.result.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "result-review",
      severity: "warning",
      visibility: "admin",
      title: "Result rerun requested",
      metadata,
    },
    activity: input.result.projectId
      ? {
          projectId: input.result.projectId,
          actorUserId: input.reviewerId,
          actorType: "user",
          eventType: "result.rerun_requested",
          entityType: "extraction_result",
          entityId: input.result.id,
          title: "Rerun requested",
          description: "A new extraction run was requested for this result.",
          visibility: "project",
          severity: "warning",
          metadata,
        }
      : null,
  });
}
