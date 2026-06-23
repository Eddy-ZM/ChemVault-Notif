import { logEvent } from "@/lib/audit/log-event";
import type { FileEvent, CreateFileEventInput } from "@/types/files";
import {
  createSupabaseFileStore,
  type FileStore,
} from "./file-store";

interface LogFileEventDependencies {
  store?: Pick<FileStore, "insertFileEvent">;
}

export async function logFileEvent(
  input: CreateFileEventInput,
  dependencies: LogFileEventDependencies = {}
): Promise<FileEvent | null> {
  try {
    const store = dependencies.store ?? createSupabaseFileStore();
    const event = await store.insertFileEvent(input);
    const metadata = {
      ...event.metadata,
      fileId: event.fileId,
      projectId: event.projectId,
      userId: event.userId,
      eventType: event.eventType,
    };

    await logEvent({
      audit: {
        actorUserId: event.userId,
        actorType: actorTypeForEvent(event.eventType),
        action: event.eventType,
        entityType: "project_file",
        entityId: event.fileId,
        projectId: event.projectId,
        userId: event.userId,
        source: "chemvault-files",
        severity: event.severity,
        visibility: "admin",
        title: event.title,
        description: event.description,
        metadata,
      },
      activity: event.projectId
        ? {
            projectId: event.projectId,
            actorUserId: event.userId,
            actorType: actorTypeForEvent(event.eventType),
            eventType: event.eventType,
            entityType: "file",
            entityId: event.fileId,
            title: event.title,
            description: event.description,
            visibility: "project",
            severity: event.severity,
            metadata,
          }
        : null,
    });

    return event;
  } catch (error) {
    if (process.env.NODE_ENV !== "test") {
      console.error("Failed to log file event.", error);
    }

    return null;
  }
}

function actorTypeForEvent(eventType: string) {
  if (
    eventType === "file.processing_queued" ||
    eventType === "file.processing_started" ||
    eventType === "file.parsing_started" ||
    eventType === "file.extraction_started" ||
    eventType === "file.validation_started" ||
    eventType === "file.processing_completed" ||
    eventType === "file.processing_failed"
  ) {
    return "system" as const;
  }

  return "user" as const;
}
