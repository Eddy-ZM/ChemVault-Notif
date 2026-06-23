import { logEvent } from "@/lib/audit/log-event";
import { getOrCreateProjectConversation } from "@/lib/messages/get-or-create-project-conversation";
import { createMessage } from "@/lib/messages/create-message";
import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import type {
  CreateExtractionResultInput,
  ExtractionResult,
  ExtractionResultMetadata,
  ExtractionStructuredData,
  ResultItemInput,
} from "@/types/extraction-results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";
import { splitResultItems } from "./split-result-items";

interface CreateExtractionResultDependencies {
  store?: Pick<
    ResultStore,
    "createResult" | "getResultByTaskId"
  >;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
  createProjectMessage?: boolean;
}

type NormalizedCreateExtractionResultInput = Omit<
  CreateExtractionResultInput,
  | "taskId"
  | "userId"
  | "fileId"
  | "projectId"
  | "rawOutput"
  | "structuredData"
  | "confidenceScore"
  | "modelName"
  | "modelVersion"
  | "extractionSummary"
  | "metadata"
> & {
  taskId: string;
  userId: string;
  fileId: string | null;
  projectId: string | null;
  rawOutput: ExtractionStructuredData;
  structuredData: ExtractionStructuredData;
  confidenceScore: number | null;
  modelName: string | null;
  modelVersion: string | null;
  extractionSummary: string | null;
  metadata: ExtractionResultMetadata;
};

export async function createExtractionResult(
  input: CreateExtractionResultInput,
  dependencies: CreateExtractionResultDependencies = {}
): Promise<ExtractionResult> {
  const normalized = normalizeInput(input);
  const store = dependencies.store ?? createSupabaseResultStore();
  const existing = await store.getResultByTaskId(normalized.taskId);

  if (existing) {
    return existing;
  }

  const result = await store.createResult(normalized, resultItems(normalized));

  await logResultCreated(result);
  await (dependencies.notifyFn ?? notify)(resultReadyNotification(result));

  if (dependencies.createProjectMessage !== false && result.projectId) {
    await createResultReadyMessage(result);
  }

  return result;
}

function normalizeInput(
  input: CreateExtractionResultInput
): NormalizedCreateExtractionResultInput {
  const taskId = input.taskId?.trim();
  const userId = input.userId?.trim();

  if (!taskId) {
    throw new NotificationError("taskId is required.", undefined, 400);
  }

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  return {
    ...input,
    taskId,
    userId,
    fileId: normalizeOptionalId(input.fileId),
    projectId: normalizeOptionalId(input.projectId),
    rawOutput: normalizeObject(input.rawOutput),
    structuredData: normalizeObject(input.structuredData),
    confidenceScore: normalizeConfidence(input.confidenceScore),
    modelName: optionalTrimmed(input.modelName),
    modelVersion: optionalTrimmed(input.modelVersion),
    extractionSummary: optionalTrimmed(input.extractionSummary),
    metadata: normalizeObject(input.metadata),
  };
}

function normalizeOptionalId(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalTrimmed(value: string | null | undefined): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeConfidence(value: number | null | undefined): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

function normalizeObject(
  value: ExtractionStructuredData | ExtractionResultMetadata | null | undefined
): ExtractionStructuredData {
  if (!value || Array.isArray(value)) {
    return {};
  }

  return value;
}

async function logResultCreated(result: ExtractionResult) {
  const metadata = {
    resultId: result.id,
    taskId: result.taskId,
    fileId: result.fileId,
    projectId: result.projectId,
    userId: result.userId,
    status: result.status,
    confidenceScore: result.confidenceScore,
    modelName: result.modelName,
    modelVersion: result.modelVersion,
  };

  await logEvent({
    audit: {
      actorUserId: result.userId,
      actorType: "ai",
      action: "result.created",
      entityType: "extraction_result",
      entityId: result.id,
      projectId: result.projectId,
      userId: result.userId,
      source: "ai-extractor",
      severity: "success",
      visibility: "admin",
      title: "Extraction result created",
      description: "AI extraction output is ready for human review.",
      metadata,
    },
    activity: result.projectId
      ? {
          projectId: result.projectId,
          actorUserId: result.userId,
          actorType: "ai",
          eventType: "result.ready_for_review",
          entityType: "extraction_result",
          entityId: result.id,
          title: "Extraction result ready for review",
          description:
            "ChemVault has extracted scientific data from this file.",
          visibility: "project",
          severity: "success",
          metadata,
        }
      : null,
  });
}

function resultReadyNotification(result: ExtractionResult): NotificationPayload {
  return {
    userId: result.userId,
    title: "Extraction result ready for review",
    body: "ChemVault has extracted scientific data from your file. Please review the result.",
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
      pushPreviewAllowed: true,
    },
  };
}

function resultItems(input: {
  items?: ResultItemInput[] | null;
  structuredData: ExtractionStructuredData;
}): ResultItemInput[] {
  return input.items && input.items.length > 0
    ? input.items
    : splitResultItems(input.structuredData);
}

async function createResultReadyMessage(result: ExtractionResult) {
  if (!result.projectId) {
    return;
  }

  const conversation = await getOrCreateProjectConversation({
    projectId: result.projectId,
    userId: result.userId,
    title: "Project conversation",
  });

  await createMessage(
    {
      conversationId: conversation.id,
      senderId: result.userId,
      senderType: "task",
      body: "Extraction result is ready for review.",
      metadata: {
        projectId: result.projectId,
        resultId: result.id,
        taskId: result.taskId,
        notificationTitle: "Extraction result ready",
      },
    },
    { allowPrivilegedSenderTypes: true }
  );
}
