import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Database,
  FileEventInsert,
  Json,
  ProjectFileInsert,
  ProjectFileUpdate,
} from "@/lib/supabase/database.types";
import type {
  CreateFileEventInput,
  CreateProjectFileInput,
  FileEvent,
  FileMetadata,
  ProjectFile,
} from "@/types/files";
import { toFileEvent, toProjectFile } from "./transform";

export interface UpdateProjectFileRecordInput {
  status?: ProjectFile["status"];
  processingStatus?: ProjectFile["processingStatus"];
  extractionTaskId?: string | null;
  metadata?: FileMetadata;
}

export interface FileStore {
  createFile(input: CreateProjectFileInput): Promise<ProjectFile>;
  getFile(fileId: string): Promise<ProjectFile | null>;
  listProjectFiles(projectId: string): Promise<ProjectFile[]>;
  updateFile(
    fileId: string,
    update: UpdateProjectFileRecordInput
  ): Promise<ProjectFile>;
  insertFileEvent(input: CreateFileEventInput): Promise<FileEvent>;
  listFileEvents(fileId: string, limit?: number): Promise<FileEvent[]>;
  isProjectMember(projectId: string, userId: string): Promise<boolean>;
}

export function createSupabaseFileStore(
  supabase: SupabaseClient<Database> = createSupabaseAdminClient()
): FileStore {
  return {
    async createFile(input) {
      const insert: ProjectFileInsert = {
        project_id: input.projectId ?? null,
        user_id: input.userId,
        storage_bucket: input.storageBucket,
        storage_path: input.storagePath,
        original_file_name: input.originalFileName,
        file_name: input.fileName,
        mime_type: input.mimeType ?? null,
        file_size: input.fileSize ?? null,
        file_hash: input.fileHash ?? null,
        status: "uploaded",
        processing_status: "none",
        metadata: (input.metadata ?? {}) as Json,
      };

      const { data, error } = await supabase
        .from("project_files")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to register project file.");
      }

      return toProjectFile(data);
    },

    async getFile(fileId) {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("id", fileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toProjectFile(data) : null;
    },

    async listProjectFiles(projectId) {
      const { data, error } = await supabase
        .from("project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      return (data ?? []).map(toProjectFile);
    },

    async updateFile(fileId, update) {
      const dbUpdate: ProjectFileUpdate = {
        status: update.status,
        processing_status: update.processingStatus,
        extraction_task_id: update.extractionTaskId,
        metadata: update.metadata as Json | undefined,
      };

      const { data, error } = await supabase
        .from("project_files")
        .update(dbUpdate)
        .eq("id", fileId)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to update project file.");
      }

      return toProjectFile(data);
    },

    async insertFileEvent(input) {
      const insert: FileEventInsert = {
        file_id: input.fileId,
        project_id: input.projectId ?? null,
        user_id: input.userId ?? null,
        event_type: input.eventType,
        title: input.title,
        description: input.description ?? null,
        severity: input.severity ?? "info",
        metadata: (input.metadata ?? {}) as Json,
      };

      const { data, error } = await supabase
        .from("file_events")
        .insert(insert)
        .select("*")
        .single();

      if (error || !data) {
        throw error ?? new Error("Failed to create file event.");
      }

      return toFileEvent(data);
    },

    async listFileEvents(fileId, limit = 100) {
      const { data, error } = await supabase
        .from("file_events")
        .select("*")
        .eq("file_id", fileId)
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) {
        throw error;
      }

      return (data ?? []).map(toFileEvent);
    },

    async isProjectMember(projectId, userId) {
      const { data: conversations, error: conversationError } = await supabase
        .from("conversations")
        .select("id")
        .eq("type", "project")
        .eq("project_id", projectId);

      if (conversationError) {
        throw conversationError;
      }

      const conversationIds = (conversations ?? []).map(
        (conversation) => conversation.id
      );

      if (conversationIds.length === 0) {
        return false;
      }

      const { data, error } = await supabase
        .from("conversation_members")
        .select("id")
        .eq("user_id", userId)
        .in("conversation_id", conversationIds)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return Boolean(data);
    },
  };
}
