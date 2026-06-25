import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { publishFeatureUpdate } from "@/lib/feature-updates/publish-feature-update";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdminUser();
    const params = await context.params;
    const body = await parseJson(request);
    const result = await publishFeatureUpdate({
      updateId: params.id,
      actorId: user.id,
      notifyUsers: booleanValue(body, "notifyUsers"),
      pushPreviewAllowed: booleanValue(body, "pushPreviewAllowed"),
      confirmAllUsers: booleanValue(body, "confirmAllUsers"),
    });

    return NextResponse.json(result);
  } catch (error) {
    return jsonError(error, "Failed to publish feature update.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function booleanValue(body: unknown, field: string): boolean {
  return (
    Boolean(body) &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    (body as Record<string, unknown>)[field] === true
  );
}
