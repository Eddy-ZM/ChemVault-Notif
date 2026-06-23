import type { User } from "@supabase/supabase-js";
import { isAdminEmail } from "@/lib/auth/require-admin";
import { NotificationError } from "@/lib/notifications/errors";
import type { ExtractionResult, ExtractionResultItem } from "@/types/extraction-results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";

export async function assertProjectResultAccess(input: {
  projectId: string;
  resultId: string;
  user: User;
  store?: Pick<ResultStore, "getResult" | "isProjectMember">;
}): Promise<ExtractionResult> {
  const store = input.store ?? createSupabaseResultStore();
  const result = await store.getResult(input.resultId);

  if (!result || result.projectId !== input.projectId) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertResultAccessForUser({ result, user: input.user, store });
  return result;
}

export async function assertResultAccess(input: {
  resultId: string;
  user: User;
  store?: Pick<ResultStore, "getResult" | "isProjectMember">;
}): Promise<ExtractionResult> {
  const store = input.store ?? createSupabaseResultStore();
  const result = await store.getResult(input.resultId);

  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertResultAccessForUser({ result, user: input.user, store });
  return result;
}

export async function assertResultItemAccess(input: {
  itemId: string;
  user: User;
  store?: Pick<ResultStore, "getResult" | "getResultItem" | "isProjectMember">;
}): Promise<{
  result: ExtractionResult;
  item: ExtractionResultItem;
}> {
  const store = input.store ?? createSupabaseResultStore();
  const item = await store.getResultItem(input.itemId);

  if (!item) {
    throw new NotificationError("Extraction result item not found.", undefined, 404);
  }

  const result = await store.getResult(item.resultId);
  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertResultAccessForUser({ result, user: input.user, store });
  return { result, item };
}

async function assertResultAccessForUser(input: {
  result: ExtractionResult;
  user: User;
  store: Pick<ResultStore, "isProjectMember">;
}) {
  if (
    input.result.userId === input.user.id ||
    isAdminEmail(input.user.email) ||
    (input.result.projectId &&
      (await input.store.isProjectMember(input.result.projectId, input.user.id)))
  ) {
    return;
  }

  throw new NotificationError("Extraction result access required.", undefined, 403);
}
