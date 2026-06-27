import { isChemVaultAdminUser } from "@/lib/auth/require-admin";
import { NotificationError } from "@/lib/notifications/errors";
import type { AuthenticatedChemVaultUser } from "@/types/user-system";
import type { ProjectFile } from "@/types/files";
import {
  createSupabaseFileStore,
  type FileStore,
} from "./file-store";

export async function assertProjectFileAccess(input: {
  projectId: string;
  fileId: string;
  user: AuthenticatedChemVaultUser;
  store?: Pick<FileStore, "getFile" | "isProjectMember">;
}): Promise<ProjectFile> {
  const store = input.store ?? createSupabaseFileStore();
  const file = await store.getFile(input.fileId);

  if (!file || file.projectId !== input.projectId) {
    throw new NotificationError("Project file not found.", undefined, 404);
  }

  if (
    file.userId === input.user.id ||
    isChemVaultAdminUser(input.user) ||
    (await store.isProjectMember(input.projectId, input.user.id))
  ) {
    return file;
  }

  throw new NotificationError("Project file access required.", undefined, 403);
}

export async function assertProjectAccess(input: {
  projectId: string;
  user: AuthenticatedChemVaultUser;
  store?: Pick<FileStore, "isProjectMember">;
}): Promise<void> {
  if (isChemVaultAdminUser(input.user)) {
    return;
  }

  const store = input.store ?? createSupabaseFileStore();
  const isMember = await store.isProjectMember(input.projectId, input.user.id);

  if (!isMember) {
    throw new NotificationError("Project access required.", undefined, 403);
  }
}
