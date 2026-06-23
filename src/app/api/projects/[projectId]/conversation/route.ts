import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { getOrCreateProjectConversation } from "@/lib/messages/get-or-create-project-conversation";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await context.params;
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const body = await parseJson(request);
    const conversation = await getOrCreateProjectConversation({
      projectId,
      userId: user.id,
      title: titleText(body),
    });

    return NextResponse.json({ conversation });
  } catch (error) {
    return jsonError(error, "Failed to load project conversation.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function titleText(body: unknown): string | null {
  if (!isRecord(body)) {
    return null;
  }

  return typeof body.title === "string" ? body.title : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
