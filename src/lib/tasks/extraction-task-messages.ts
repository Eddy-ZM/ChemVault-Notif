import type { Json } from "@/lib/supabase/database.types";
import { createMessage } from "@/lib/messages/create-message";
import { getOrCreateProjectConversation } from "@/lib/messages/get-or-create-project-conversation";
import type { CreateMessageInput, MessageMetadata } from "@/types/messages";
import type { ChemVaultExtractionTask, ExtractionTaskStatus } from "./types";

interface ExtractionTaskMessageDefinition {
  body: string;
  notificationTitle: string;
}

const extractionTaskMessageMap = {
  uploaded: {
    body: "Document is ready for AI extraction.",
    notificationTitle: "AI extraction ready",
  },
  queued: {
    body: "AI task queued for document processing.",
    notificationTitle: "AI extraction queued",
  },
  processing: {
    body: "AI task started processing this document.",
    notificationTitle: "AI extraction started",
  },
  extracting: {
    body: "AI is extracting tables, chemical entities, and experimental values.",
    notificationTitle: "AI extraction update",
  },
  validating: {
    body: "Validation completed successfully.",
    notificationTitle: "Validation completed",
  },
  completed: {
    body: "Extraction completed. Structured results are ready for review.",
    notificationTitle: "Extraction completed",
  },
  failed: {
    body: "Extraction failed. Please review the task details.",
    notificationTitle: "Extraction failed",
  },
} satisfies Record<ExtractionTaskStatus, ExtractionTaskMessageDefinition>;

export interface ExtractionTaskProjectMessageInput {
  projectId: string;
  userId: string;
  title: string;
  body: string;
  metadata: MessageMetadata;
}

export function buildExtractionTaskMessageInput(
  task: ChemVaultExtractionTask
): ExtractionTaskProjectMessageInput | null {
  if (!task.projectId) {
    return null;
  }

  const definition = extractionTaskMessageMap[task.status];

  return {
    projectId: task.projectId,
    userId: task.userId,
    title: "AI Paper Extraction Project",
    body: definition.body,
    metadata: compactMetadata({
      taskId: task.id,
      projectId: task.projectId,
      fileId: task.fileId,
      fileName: task.fileName,
      status: task.status,
      progress: task.progress,
      ...task.metadata,
      errorMessage: task.errorMessage,
      notificationTitle: definition.notificationTitle,
    }),
  };
}

export async function createExtractionTaskMessage(
  task: ChemVaultExtractionTask
) {
  const input = buildExtractionTaskMessageInput(task);

  if (!input) {
    return null;
  }

  const conversation = await getOrCreateProjectConversation({
    projectId: input.projectId,
    userId: input.userId,
    title: input.title,
  });
  const messageInput: CreateMessageInput = {
    conversationId: conversation.id,
    senderId: null,
    senderType: "task",
    body: input.body,
    metadata: input.metadata,
  };

  return createMessage(messageInput, {
    allowPrivilegedSenderTypes: true,
  });
}

function compactMetadata(metadata: Record<string, Json | undefined>) {
  return Object.fromEntries(
    Object.entries(metadata).filter(
      ([, value]) => value !== null && value !== undefined
    )
  ) as MessageMetadata;
}
