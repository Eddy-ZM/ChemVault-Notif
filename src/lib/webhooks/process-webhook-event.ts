import { createMessage } from "@/lib/messages/create-message";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { registerUploadedFile } from "@/lib/files/register-uploaded-file";
import { updateFileProcessingStatus } from "@/lib/files/update-file-processing-status";
import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import { createExtractionResult } from "@/lib/results/create-extraction-result";
import type {
  NotificationMetadata,
  NotificationPayload,
} from "@/lib/notifications/types";
import { updateExtractionTaskStatus } from "@/lib/tasks/update-extraction-task-status";
import type { UpdateExtractionTaskStatusInput } from "@/lib/tasks/types";
import {
  resolveBroadcastRecipients,
  uniqueValidUserIds,
} from "@/lib/broadcasts/resolve-broadcast-recipients";
import { isBroadcastTargetType } from "@/lib/broadcasts/transform";
import type { BroadcastJson, BroadcastTargetType } from "@/types/broadcasts";
import type {
  CreateProjectFileInput,
  UpdateFileProcessingStatusInput,
} from "@/types/files";
import type { CreateExtractionResultInput } from "@/types/extraction-results";
import type { CreateMessageInput, MessageMetadata } from "@/types/messages";
import type { WebhookEvent, WebhookPayload } from "@/types/webhooks";
import {
  createSupabaseWebhookStore,
  type WebhookStore,
} from "./webhook-store";

export type WebhookProcessorStore = Pick<
  WebhookStore,
  "getEvent" | "updateEventStatus" | "insertLog"
>;

export interface WebhookProcessorDependencies {
  store?: WebhookProcessorStore;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
  updateExtractionTaskStatusFn?: (
    input: UpdateExtractionTaskStatusInput
  ) => Promise<unknown>;
  createMessageFn?: (input: CreateMessageInput) => Promise<unknown>;
  registerUploadedFileFn?: (input: CreateProjectFileInput) => Promise<unknown>;
  updateFileProcessingStatusFn?: (
    input: UpdateFileProcessingStatusInput
  ) => Promise<unknown>;
  createExtractionResultFn?: (
    input: CreateExtractionResultInput
  ) => Promise<unknown>;
  resolveBroadcastRecipientsFn?: typeof resolveBroadcastRecipients;
}

export async function processWebhookEvent(
  eventId: string,
  dependencies: WebhookProcessorDependencies = {}
): Promise<WebhookEvent> {
  const store = dependencies.store ?? createSupabaseWebhookStore();
  const event = await store.getEvent(eventId);

  if (!event) {
    throw new NotificationError("Webhook event not found.", undefined, 404);
  }

  if (event.status === "processed" || event.status === "processing") {
    return event;
  }

  await store.updateEventStatus(event.id, {
    status: "processing",
    errorMessage: null,
  });
  await store.insertLog({
    webhookEventId: event.id,
    level: "info",
    message: "Processing webhook event.",
    metadata: {
      eventType: event.eventType,
      source: event.source,
    },
  });

  try {
    await routeWebhookEvent(event, dependencies);
    const processed = await store.updateEventStatus(event.id, {
      status: "processed",
      errorMessage: null,
      processedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      actorType: "service",
      action: "webhook.processed",
      entityType: "webhook_event",
      entityId: event.id,
      projectId: event.projectId,
      userId: event.userId,
      source: event.serviceName,
      severity: "success",
      visibility: "admin",
      title: "Webhook processed",
      description: `${event.serviceName} ${event.eventType} processed.`,
      metadata: webhookAuditMetadata(event),
    });
    await store.insertLog({
      webhookEventId: event.id,
      level: "info",
      message: "Processed webhook event.",
      metadata: {
        eventType: event.eventType,
      },
    });
    return processed;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to process webhook event.";
    await store.updateEventStatus(event.id, {
      status: "failed",
      errorMessage: message,
      processedAt: new Date().toISOString(),
    });
    await logAuditEvent({
      actorType: "service",
      action: "webhook.failed",
      entityType: "webhook_event",
      entityId: event.id,
      projectId: event.projectId,
      userId: event.userId,
      source: event.serviceName,
      severity: "error",
      visibility: "admin",
      title: "Webhook failed",
      description: message,
      metadata: {
        ...webhookAuditMetadata(event),
        errorMessage: message,
      },
    });
    await store.insertLog({
      webhookEventId: event.id,
      level: "error",
      message: "Failed to process webhook event.",
      metadata: {
        errorMessage: message,
      },
    });
    throw error instanceof Error
      ? error
      : new NotificationError(message, undefined, 500);
  }
}

function webhookAuditMetadata(event: WebhookEvent): WebhookPayload {
  return {
    webhookEventId: event.id,
    eventType: event.eventType,
    source: event.source,
    serviceName: event.serviceName,
    taskId: event.taskId,
    conversationId: event.conversationId,
    idempotencyKey: event.idempotencyKey,
  };
}

async function routeWebhookEvent(
  event: WebhookEvent,
  dependencies: WebhookProcessorDependencies
) {
  switch (event.eventType) {
    case "notification.created":
      return (dependencies.notifyFn ?? notify)(
        toNotificationPayload(event)
      );
    case "task.status_changed":
      return (dependencies.updateExtractionTaskStatusFn ??
        updateExtractionTaskStatus)(toTaskStatusInput(event));
    case "message.created":
      return (dependencies.createMessageFn ?? createPrivilegedMessage)(
        toMessageInput(event)
      );
    case "admin.broadcast":
      return broadcastNotifications(
        event.payload,
        dependencies.notifyFn ?? notify,
        dependencies.resolveBroadcastRecipientsFn ?? resolveBroadcastRecipients
      );
    case "file.uploaded":
      return (dependencies.registerUploadedFileFn ?? registerUploadedFile)(
        toFileUploadInput(event)
      );
    case "file.status_changed":
      return (dependencies.updateFileProcessingStatusFn ??
        updateFileProcessingStatus)(toFileStatusInput(event));
    case "result.created":
      return (dependencies.createExtractionResultFn ?? createExtractionResult)(
        toResultCreatedInput(event)
      );
  }
}

function toNotificationPayload(event: WebhookEvent): NotificationPayload {
  const payload = event.payload;
  const userId =
    optionalPayloadString(payload.userId) ??
    optionalPayloadString(event.userId) ??
    "";

  if (!userId) {
    throw new NotificationError(
      "userId is required for notification.created.",
      undefined,
      400
    );
  }

  return {
    userId,
    title: requiredPayloadString(payload, "title", "notification.created"),
    body: optionalPayloadString(payload.body),
    type: optionalPayloadString(payload.type),
    source: optionalPayloadString(payload.source),
    link: optionalPayloadString(payload.link),
    metadata: payloadObject(payload.metadata) as NotificationMetadata,
  };
}

function toTaskStatusInput(event: WebhookEvent): UpdateExtractionTaskStatusInput {
  const payload = event.payload;
  const taskId =
    optionalPayloadString(payload.taskId) ??
    optionalPayloadString(event.taskId) ??
    "";

  if (!taskId) {
    throw new NotificationError(
      "taskId is required for task.status_changed.",
      undefined,
      400
    );
  }

  return {
    taskId,
    projectId: optionalPayloadString(event.projectId),
    status: requiredPayloadString(payload, "status", "task.status_changed"),
    progress: numberValue(payload.progress),
    errorMessage: optionalPayloadString(payload.errorMessage),
    metadata: payloadObject(payload.metadata),
  };
}

function toMessageInput(event: WebhookEvent): CreateMessageInput {
  const payload = event.payload;
  const conversationId =
    optionalPayloadString(payload.conversationId) ??
    optionalPayloadString(event.conversationId) ??
    "";

  if (!conversationId) {
    throw new NotificationError(
      "conversationId is required for message.created.",
      undefined,
      400
    );
  }

  return {
    conversationId,
    senderId: optionalPayloadString(payload.senderId),
    senderType: messageSenderType(payload.senderType),
    body: requiredPayloadString(payload, "body", "message.created"),
    metadata: payloadObject(payload.metadata) as MessageMetadata,
  };
}

function toFileUploadInput(event: WebhookEvent): CreateProjectFileInput {
  const payload = event.payload;
  const userId =
    optionalPayloadString(payload.userId) ??
    optionalPayloadString(event.userId) ??
    "";
  const projectId =
    optionalPayloadString(payload.projectId) ??
    optionalPayloadString(event.projectId);

  if (!userId) {
    throw new NotificationError(
      "userId is required for file.uploaded.",
      undefined,
      400
    );
  }

  return {
    projectId,
    userId,
    storageBucket: requiredPayloadString(payload, "storageBucket", "file.uploaded"),
    storagePath: requiredPayloadString(payload, "storagePath", "file.uploaded"),
    originalFileName: requiredPayloadString(
      payload,
      "originalFileName",
      "file.uploaded"
    ),
    fileName: requiredPayloadString(payload, "fileName", "file.uploaded"),
    mimeType: optionalPayloadString(payload.mimeType),
    fileSize: numberValue(payload.fileSize),
    fileHash: optionalPayloadString(payload.fileHash),
    metadata: payloadObject(payload.metadata),
  };
}

function toFileStatusInput(event: WebhookEvent): UpdateFileProcessingStatusInput {
  const payload = event.payload;
  const fileId = optionalPayloadString(payload.fileId) ?? "";

  if (!fileId) {
    throw new NotificationError(
      "fileId is required for file.status_changed.",
      undefined,
      400
    );
  }

  return {
    fileId,
    status: optionalPayloadString(payload.status),
    processingStatus: optionalPayloadString(payload.processingStatus),
    extractionTaskId: optionalPayloadString(payload.extractionTaskId),
    errorMessage: optionalPayloadString(payload.errorMessage),
    metadata: payloadObject(payload.metadata),
  };
}

function toResultCreatedInput(event: WebhookEvent): CreateExtractionResultInput {
  const payload = event.payload;
  const taskId =
    optionalPayloadString(payload.taskId) ??
    optionalPayloadString(event.taskId) ??
    "";
  const userId =
    optionalPayloadString(payload.userId) ??
    optionalPayloadString(event.userId) ??
    "";
  const projectId =
    optionalPayloadString(payload.projectId) ??
    optionalPayloadString(event.projectId);

  if (!taskId) {
    throw new NotificationError(
      "taskId is required for result.created.",
      undefined,
      400
    );
  }

  if (!userId) {
    throw new NotificationError(
      "userId is required for result.created.",
      undefined,
      400
    );
  }

  return {
    taskId,
    fileId: optionalPayloadString(payload.fileId),
    projectId,
    userId,
    rawOutput: payloadObject(payload.rawOutput),
    structuredData: payloadObject(payload.structuredData),
    modelName: optionalPayloadString(payload.modelName),
    modelVersion: optionalPayloadString(payload.modelVersion),
    confidenceScore: numberValue(payload.confidenceScore),
    metadata: payloadObject(payload.metadata),
  };
}

async function createPrivilegedMessage(input: CreateMessageInput) {
  return createMessage(input, {
    allowPrivilegedSenderTypes: true,
  });
}

async function broadcastNotifications(
  payload: WebhookPayload,
  notifyFn: (payload: NotificationPayload) => Promise<unknown>,
  resolveRecipientsFn: typeof resolveBroadcastRecipients
) {
  const userIds = await resolveBroadcastUserIds(payload, resolveRecipientsFn);

  if (userIds.length === 0) {
    throw new NotificationError(
      "At least one valid recipient is required for admin.broadcast.",
      undefined,
      400
    );
  }

  const title = requiredPayloadString(payload, "title", "admin.broadcast");
  const body = requiredPayloadString(payload, "body", "admin.broadcast");
  const link = optionalPayloadString(payload.link) ?? "/notifications";
  const source = optionalPayloadString(payload.source) ?? "admin";
  const rawMetadata = payloadObject(payload.metadata) as NotificationMetadata;
  const ignoreNotificationPreferences =
    isTrue(payload.ignoreNotificationPreferences) ||
    isTrue(payload.ignorePreferences);
  const metadata = {
    ...rawMetadata,
    pushPreviewAllowed:
      payload.pushPreviewAllowed === true ||
      rawMetadata.pushPreviewAllowed === true,
    ignoreNotificationPreferences,
  };

  await Promise.all(
    userIds.map((userId) =>
      notifyFn({
        userId,
        title,
        body,
        type: "system",
        source,
        link,
        metadata,
      })
    )
  );
}

function isTrue(value: unknown): boolean {
  return value === true;
}

async function resolveBroadcastUserIds(
  payload: WebhookPayload,
  resolveRecipientsFn: typeof resolveBroadcastRecipients
): Promise<string[]> {
  const userIds = uniqueValidUserIds(arrayValue(payload.userIds));

  if (userIds.length > 0) {
    return userIds;
  }

  const segmentId = optionalPayloadString(payload.segmentId);
  if (segmentId) {
    return resolveRecipientsFn({
      targetType: "segment",
      targetPayload: { segmentId },
    });
  }

  const targetType = optionalPayloadString(payload.targetType);
  if (isBroadcastTargetType(targetType)) {
    return resolveRecipientsFn({
      targetType,
      targetPayload: webhookTargetPayload(payload, targetType),
    });
  }

  throw new NotificationError(
    "userIds, segmentId, or targetType is required for admin.broadcast.",
    undefined,
    400
  );
}

function webhookTargetPayload(
  payload: WebhookPayload,
  targetType: BroadcastTargetType
): BroadcastJson {
  const targetPayload = payloadObject(payload.targetPayload) as BroadcastJson;

  if (targetType === "single_user") {
    targetPayload.userId =
      optionalPayloadString(payload.userId) ??
      optionalPayloadString(targetPayload.userId) ??
      "";
  }

  if (targetType === "selected_users") {
    targetPayload.userIds =
      stringArrayValue(payload.userIds).length > 0
        ? stringArrayValue(payload.userIds)
        : stringArrayValue(targetPayload.userIds);
  }

  if (targetType === "project_members") {
    targetPayload.projectId =
      optionalPayloadString(payload.projectId) ??
      optionalPayloadString(targetPayload.projectId) ??
      "";
  }

  if (targetType === "segment") {
    targetPayload.segmentId =
      optionalPayloadString(payload.segmentId) ??
      optionalPayloadString(targetPayload.segmentId) ??
      "";
  }

  if (targetType === "all_users" && payload.confirmAllUsers === true) {
    targetPayload.confirmAllUsers = true;
  }

  return targetPayload;
}

function requiredPayloadString(
  payload: WebhookPayload,
  field: string,
  eventType: string
): string {
  const value = optionalPayloadString(payload[field]);

  if (!value) {
    throw new NotificationError(
      `${field} is required for ${eventType}.`,
      undefined,
      400
    );
  }

  return value;
}

function optionalPayloadString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function payloadObject(value: unknown): Record<string, never> | WebhookPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as WebhookPayload;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringArrayValue(value: unknown): string[] {
  return arrayValue(value).filter(
    (item): item is string => typeof item === "string"
  );
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function messageSenderType(value: unknown): CreateMessageInput["senderType"] {
  if (
    value === "admin" ||
    value === "system" ||
    value === "ai" ||
    value === "task"
  ) {
    return value;
  }

  return "system";
}
