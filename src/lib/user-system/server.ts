import { cookies, headers } from "next/headers";
import { NotificationError } from "@/lib/notifications/errors";
import type {
  AuthenticatedChemVaultUser,
  ChemVaultUser,
  UserSystemAccessDecision,
} from "@/types/user-system";
import { getUserSystemCookieName, getUserSystemOrigin } from "./config";

export async function getCurrentChemVaultUser(): Promise<AuthenticatedChemVaultUser | null> {
  const cookieHeader = await userSystemCookieHeader();

  if (!cookieHeader) {
    return null;
  }

  const response = await fetch(new URL("/api/auth/me", getUserSystemOrigin()), {
    method: "GET",
    headers: {
      cookie: cookieHeader,
      accept: "application/json",
    },
    cache: "no-store",
  }).catch(() => null);

  if (!response?.ok) {
    return null;
  }

  const body = (await response.json().catch(() => null)) as {
    user?: ChemVaultUser;
  } | null;
  const user = body?.user;

  if (!user?.id) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    role: user.role,
    systemRole: user.systemRole,
    permissions: user.permissions ?? [],
    services: user.services ?? [],
    pages: user.pages ?? [],
    source: "chemvault_user",
  };
}

export async function requireChemVaultUser(): Promise<AuthenticatedChemVaultUser> {
  const user = await getCurrentChemVaultUser();

  if (!user) {
    throw new NotificationError("Unauthorized.", undefined, 401);
  }

  return user;
}

export async function checkUserSystemAccess(input: {
  permission?: string;
  service?: string;
  page?: string;
}): Promise<UserSystemAccessDecision> {
  const cookieHeader = await userSystemCookieHeader();

  if (!cookieHeader) {
    return { allowed: false, reason: "missing_session" };
  }

  const params = new URLSearchParams();
  if (input.permission) params.set("permission", input.permission);
  if (input.service) params.set("service", input.service);
  if (input.page) params.set("page", input.page);

  const response = await fetch(
    new URL(`/api/access/check?${params.toString()}`, getUserSystemOrigin()),
    {
      method: "GET",
      headers: {
        cookie: cookieHeader,
        accept: "application/json",
      },
      cache: "no-store",
    }
  ).catch(() => null);

  if (!response?.ok) {
    return { allowed: false, reason: "access_check_failed" };
  }

  return (await response.json()) as UserSystemAccessDecision;
}

export async function proxyUserSystemLogout(): Promise<Response | null> {
  const cookieHeader = await userSystemCookieHeader();

  if (!cookieHeader) {
    return null;
  }

  return fetch(new URL("/api/auth/logout", getUserSystemOrigin()), {
    method: "POST",
    headers: {
      cookie: cookieHeader,
      accept: "application/json",
    },
    cache: "no-store",
  }).catch(() => null);
}

async function userSystemCookieHeader(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookieName = getUserSystemCookieName();
  const directCookie = cookieStore.get(cookieName);

  if (directCookie?.value) {
    return `${cookieName}=${encodeURIComponent(directCookie.value)}`;
  }

  const incomingCookie = (await headers()).get("cookie");
  return incomingCookie || null;
}
