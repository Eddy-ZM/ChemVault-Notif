import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSupabase } from "@/lib/api/auth";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { createMessage } from "@/lib/messages/create-message";
import { createSupabaseMessageStore } from "@/lib/messages/message-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const store = createSupabaseMessageStore();
    const isMember = await store.isConversationMember(conversationId, user.id);

    if (!isMember) {
      return NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      );
    }

    const messages = await store.listConversationMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    return jsonError(error, "Failed to load conversation messages.");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await context.params;
    const { user } = await getAuthenticatedSupabase();

    if (!user) {
      return unauthorized();
    }

    const body = await parseJson(request);
    const message = await createMessage({
      conversationId,
      senderId: user.id,
      senderType: "user",
      body: bodyText(body),
      metadata: {},
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create conversation message.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function bodyText(body: unknown): string {
  if (!isRecord(body)) {
    return "";
  }

  return typeof body.body === "string" ? body.body : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
