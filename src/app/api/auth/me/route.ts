import { NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { isChemVaultAdminUser } from "@/lib/auth/require-admin";
import { jsonError } from "@/lib/api/responses";
import {
  getUserSystemDashboardUrl,
  getUserSystemLoginUrl,
  getUserSystemProfileUrl,
} from "@/lib/user-system/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { user } = await getAuthenticatedSupabase();

    return NextResponse.json({
      user,
      isAdmin: isChemVaultAdminUser(user),
      links: {
        login: getUserSystemLoginUrl(),
        profile: getUserSystemProfileUrl(),
        dashboard: getUserSystemDashboardUrl(),
      },
    });
  } catch (error) {
    return jsonError(error, "Failed to load authenticated user.");
  }
}
