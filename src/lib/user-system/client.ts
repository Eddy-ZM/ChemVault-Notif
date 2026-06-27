import type { AuthenticatedChemVaultUser } from "@/types/user-system";

export interface CurrentUserResponse {
  user: AuthenticatedChemVaultUser | null;
  isAdmin: boolean;
  links: {
    login: string;
    profile: string;
    dashboard: string;
  };
}

export async function fetchCurrentUser(): Promise<CurrentUserResponse> {
  const response = await fetch("/api/auth/me", {
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("Unable to load ChemVault user session.");
  }

  return (await response.json()) as CurrentUserResponse;
}

export async function logoutCurrentUser(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
}
