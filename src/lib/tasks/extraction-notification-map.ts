import type { NotificationPayload } from "@/lib/notifications/types";
import type {
  ChemVaultExtractionTask,
  ExtractionTaskStatus,
} from "./types";

interface ExtractionNotificationDefinition {
  title: string;
  body: string;
  type: NonNullable<NotificationPayload["type"]>;
  source: string;
  link: (task: ChemVaultExtractionTask) => string | null;
}

export const extractionNotificationMap = {
  uploaded: {
    title: "File uploaded",
    body: "Your file has been uploaded and is ready for processing.",
    type: "info",
    source: "ai-extractor",
    link: () => null,
  },
  queued: {
    title: "Extraction queued",
    body: "Your AI extraction task has been added to the processing queue.",
    type: "task",
    source: "ai-extractor",
    link: () => null,
  },
  processing: {
    title: "Extraction started",
    body: "ChemVault AI has started processing your document.",
    type: "task",
    source: "ai-extractor",
    link: () => null,
  },
  extracting: {
    title: "Scientific data extraction in progress",
    body: "ChemVault AI is extracting tables, chemical entities, and experimental data.",
    type: "task",
    source: "ai-extractor",
    link: () => null,
  },
  validating: {
    title: "Validating extracted data",
    body: "ChemVault AI is checking the extracted data for consistency.",
    type: "task",
    source: "ai-extractor",
    link: () => null,
  },
  completed: {
    title: "Extraction completed",
    body: "Your document has been converted into structured scientific data.",
    type: "success",
    source: "ai-extractor",
    link: (task) =>
      task.projectId ? `/projects/${task.projectId}/results` : null,
  },
  failed: {
    title: "Extraction failed",
    body: "ChemVault AI could not complete the extraction task. Please review the error details.",
    type: "error",
    source: "ai-extractor",
    link: (task) =>
      task.projectId ? `/projects/${task.projectId}/tasks/${task.id}` : null,
  },
} satisfies Record<ExtractionTaskStatus, ExtractionNotificationDefinition>;

export function buildExtractionNotificationPayload(
  task: ChemVaultExtractionTask
): NotificationPayload {
  const definition = extractionNotificationMap[task.status];

  return {
    userId: task.userId,
    title: definition.title,
    body: definition.body,
    type: definition.type,
    source: definition.source,
    link: definition.link(task),
    metadata: compactMetadata({
      taskId: task.id,
      projectId: task.projectId,
      fileId: task.fileId,
      fileName: task.fileName,
      ...task.metadata,
      errorMessage: task.errorMessage,
    }),
  };
}

export function shouldNotifyForStatusTransition(
  previousStatus: ExtractionTaskStatus,
  nextStatus: ExtractionTaskStatus
): boolean {
  return previousStatus !== nextStatus;
}

function compactMetadata(
  metadata: NonNullable<NotificationPayload["metadata"]>
) {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== null && value !== undefined)
  ) as NonNullable<NotificationPayload["metadata"]>;
}
