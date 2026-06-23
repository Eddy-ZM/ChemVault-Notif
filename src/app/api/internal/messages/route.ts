import { NextRequest, NextResponse } from "next/server";
import { hasValidInternalKey } from "@/lib/api/internal-key";
import { jsonError, unauthorized } from "@/lib/api/responses";
import { createMessage } from "@/lib/messages/create-message";
import { isMessageSenderType } from "@/lib/messages/transform";
import { NotificationError } from "@/lib/notifications/errors";
import type { MessageMetadata, MessageSenderType } from "@/types/messages";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!hasValidInternalKey(request)) {
      return unauthorized("Invalid internal ChemVault API key.");
    }

    const body = await parseJson(request);
    const message = await createMessage(toInternalMessageInput(body), {
      allowPrivilegedSenderTypes: true,
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create internal message.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function toInternalMessageInput(body: unknown) {
  if (!isRecord(body)) {
    return {
      conversationId: "",
      senderType: "system" as const,
      body: "",
      metadata: {},
    };
  }

  return {
    conversationId: stringValue(body.conversationId),
    senderId: optionalStringValue(body.senderId),
    senderType: privilegedSenderType(body.senderType),
    body: stringValue(body.body),
    metadata: isRecord(body.metadata)
      ? (body.metadata as MessageMetadata)
      : {},
  };
}

function privilegedSenderType(value: unknown): Exclude<
  MessageSenderType,
  "user"
> {
  if (value === undefined || value === null || value === "") {
    return "system";
  }

  if (!isMessageSenderType(value) || value === "user") {
    throw new NotificationError(
      "senderType must be admin, system, ai, or task.",
      undefined,
      400
    );
  }

  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function optionalStringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}
