import { NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { proxyUserSystemLogout } from "@/lib/user-system/server";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const upstream = await proxyUserSystemLogout();
    const response = NextResponse.json({ ok: true });
    const setCookie = upstream?.headers.get("set-cookie");

    if (setCookie) {
      response.headers.append("set-cookie", setCookie);
    }

    return response;
  } catch (error) {
    return jsonError(error, "Failed to sign out.");
  }
}
