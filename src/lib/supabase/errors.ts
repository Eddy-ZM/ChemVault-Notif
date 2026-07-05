import { NotificationError } from "@/lib/notifications/errors";

export function isSupabaseMissingRelationError(error: unknown): boolean {
  if (error instanceof NotificationError) {
    return isSupabaseMissingRelationError(error.cause);
  }

  if (!error || typeof error !== "object") {
    return false;
  }

  const code = "code" in error ? (error as { code?: unknown }).code : null;
  const message =
    "message" in error ? (error as { message?: unknown }).message : null;

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    (typeof message === "string" &&
      message.toLowerCase().includes("could not find the table"))
  );
}

export function missingDatabaseFeatureError(feature: string, cause?: unknown) {
  return new NotificationError(
    `${feature} is not configured. Apply the ChemVault notification Supabase migrations.`,
    cause,
    503
  );
}
