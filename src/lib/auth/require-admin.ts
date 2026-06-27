import { NotificationError } from "@/lib/notifications/errors";
import { getAuthenticatedSupabase } from "@/lib/api/auth";

export async function requireAdminUser() {
  const { supabase, user } = await getAuthenticatedSupabase();

  if (!user) {
    throw new NotificationError("Unauthorized.", undefined, 401);
  }

  if (!isChemVaultAdminUser(user)) {
    throw new NotificationError("Admin access required.", undefined, 403);
  }

  return { supabase, user };
}

export function isChemVaultAdminUser(user: {
  email?: string | null;
  role?: string | null;
  systemRole?: string | null;
} | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return (
    isAdminEmail(user.email) ||
    user.role === "admin" ||
    user.systemRole === "admin" ||
    user.systemRole === "super_admin" ||
    user.systemRole === "owner"
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  return Boolean(normalized && getAdminEmails().includes(normalized));
}

export function getAdminEmails(): string[] {
  return (process.env.CHEMVAULT_ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
