const defaultUserOrigin = "https://user.chemvault.science";

export function getUserSystemOrigin(): string {
  return (
    process.env.CHEMVAULT_USER_ORIGIN ||
    process.env.NEXT_PUBLIC_CHEMVAULT_USER_ORIGIN ||
    defaultUserOrigin
  ).replace(/\/$/, "");
}

export function getUserSystemCookieName(): string {
  return process.env.CHEMVAULT_USER_COOKIE_NAME || "chemvault_session";
}

export function getUserSystemLoginUrl(nextUrl?: string | null): string {
  const url = new URL("/login", getUserSystemOrigin());

  if (nextUrl) {
    url.searchParams.set("next", nextUrl);
  }

  return url.toString();
}

export function getUserSystemProfileUrl(): string {
  return new URL("/settings/profile", getUserSystemOrigin()).toString();
}

export function getUserSystemDashboardUrl(): string {
  return new URL("/dashboard", getUserSystemOrigin()).toString();
}
