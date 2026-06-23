import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { ApprovedDataset, ExtractionResult, ResultItem } from "@/types/results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";

interface ApproveResultInput {
  resultId: string;
  reviewerId?: string;
  userId?: string;
  note?: string | null;
  comment?: string | null;
}

interface ApproveResultDependencies {
  store?: Pick<
    ResultStore,
    | "getResult"
    | "insertApprovedDataset"
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
): Promise<ApprovedDataset> {
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
  const items = await store.listResultItems(result.id);
  const blockingItem = items.find(
    (item) => item.status === "pending" || item.status === "uncertain"
  );

  if (blockingItem) {
    throw new NotificationError(
      "All required result items must be accepted, corrected, or explicitly rejected before approval.",
      undefined,
      400
    );
  }

  const approvedAt = new Date().toISOString();
  const updatedResult = await store.updateResult(result.id, {
    status: "approved",
    reviewedBy: reviewerId,
    reviewedAt: result.reviewedAt ?? approvedAt,
    approvedBy: reviewerId,
    approvedAt,
    rejectedBy: null,
    rejectedAt: null,
    rejectionReason: null,
  });
  const dataset = await store.insertApprovedDataset({
    resultId: result.id,
    projectId: result.projectId,
    fileId: result.fileId,
    userId: result.userId,
    title: datasetTitle(result),
    description: result.extractionSummary,
    data: finalDatasetData(updatedResult, items),
    schemaVersion: "1.0",
  });

  await store.insertReview({
    resultId: result.id,
    reviewerId,
    action: "approved",
    note: input.note ?? input.comment ?? null,
    metadata: {
      resultId: result.id,
      datasetId: dataset.id,
      previousStatus: result.status,
      status: "approved",
      reviewedItemCount: items.length,
    },
  });

  await logResultApproval({
    result: updatedResult,
    dataset,
    previousStatus: result.status,
    reviewerId,
  });
  await (dependencies.notifyFn ?? notify)({
    userId: result.userId,
    title: "Result approved",
    body: "The reviewed extraction result has been approved and saved as a structured dataset.",
    type: "success",
    source: "result-review",
    link: result.projectId
      ? `/projects/${result.projectId}/datasets/${dataset.id}`
      : `/datasets/${dataset.id}`,
    metadata: {
      resultId: result.id,
      datasetId: dataset.id,
      taskId: result.taskId,
      fileId: result.fileId,
      projectId: result.projectId,
      pushPreviewAllowed: false,
    },
  });

  return dataset;
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

  throw new NotificationError("Result approval access required.", undefined, 403);
}

function datasetTitle(result: ExtractionResult): string {
  const fileName = result.metadata?.originalFileName;
  return typeof fileName === "string" && fileName.trim()
    ? `Approved dataset: ${fileName.trim()}`
    : `Approved dataset ${result.id}`;
}

function finalDatasetData(result: ExtractionResult, items: ResultItem[]) {
  return {
    result: {
      id: result.id,
      taskId: result.taskId,
      fileId: result.fileId,
      projectId: result.projectId,
      confidenceScore: result.confidenceScore,
      modelName: result.modelName,
      modelVersion: result.modelVersion,
      extractionSummary: result.extractionSummary,
    },
    structuredData: result.structuredData,
    items: items.map((item) => ({
      id: item.id,
      itemType: item.itemType,
      label: item.label,
      value: item.value,
      confidenceScore: item.confidenceScore,
      pageNumber: item.pageNumber,
      sourceLocation: item.sourceLocation,
      status: item.status,
      reviewerNote: item.reviewerNote,
    })),
  };
}

async function logResultApproval(input: {
  result: ExtractionResult;
  dataset: ApprovedDataset;
  previousStatus: string;
  reviewerId: string;
}) {
  const metadata = {
    resultId: input.result.id,
    taskId: input.result.taskId,
    fileId: input.result.fileId,
    projectId: input.result.projectId,
    reviewerId: input.reviewerId,
    datasetId: input.dataset.id,
    previousStatus: input.previousStatus,
    status: input.result.status,
    confidenceScore: input.result.confidenceScore,
    modelName: input.result.modelName,
  };

  await logEvent({
    audit: {
      actorUserId: input.reviewerId,
      actorType: "user",
      action: "result.approved",
      entityType: "extraction_result",
      entityId: input.result.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "result-review",
      severity: "success",
      visibility: "admin",
      title: "Result approved",
      metadata,
    },
    activity: input.result.projectId
      ? {
          projectId: input.result.projectId,
          actorUserId: input.reviewerId,
          actorType: "user",
          eventType: "result.approved",
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

  await logEvent({
    audit: {
      actorUserId: input.reviewerId,
      actorType: "user",
      action: "dataset.created",
      entityType: "approved_dataset",
      entityId: input.dataset.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "result-review",
      severity: "success",
      visibility: "admin",
      title: "Approved dataset created",
      metadata,
    },
    activity: input.result.projectId
      ? {
          projectId: input.result.projectId,
          actorUserId: input.reviewerId,
          actorType: "user",
          eventType: "dataset.created",
          entityType: "approved_dataset",
          entityId: input.dataset.id,
          title: "Dataset created",
          description: "Approved scientific data was saved as a dataset.",
          visibility: "project",
          severity: "success",
          metadata,
        }
      : null,
  });
}
