import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createSupabaseBroadcastStore } from "@/lib/broadcasts/broadcast-store";
import {
  isValidUuid,
  uniqueValidUserIds,
} from "@/lib/broadcasts/resolve-broadcast-recipients";
import { NotificationError } from "@/lib/notifications/errors";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ segmentId: string }> }
) {
  try {
    await requireAdminUser();
    const { segmentId } = await context.params;
    const members = await createSupabaseBroadcastStore().listSegmentMembers(
      segmentId
    );
    return NextResponse.json({ members });
  } catch (error) {
    return jsonError(error, "Failed to load segment members.");
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ segmentId: string }> }
) {
  try {
    const { user } = await requireAdminUser();
    const { segmentId } = await context.params;
    const userIds = await parseUserIds(request);

    if (userIds.length === 0) {
      throw new NotificationError(
        "At least one valid userId is required.",
        undefined,
        400
      );
    }

    const members = await createSupabaseBroadcastStore().addSegmentMembers({
      segmentId,
      userIds,
      addedBy: user.id,
    });

    return NextResponse.json({ members });
  } catch (error) {
    return jsonError(error, "Failed to add segment members.");
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ segmentId: string }> }
) {
  try {
    await requireAdminUser();
    const { segmentId } = await context.params;
    const userIds = await parseUserIds(request);

    if (userIds.length === 0) {
      throw new NotificationError(
        "At least one valid userId is required.",
        undefined,
        400
      );
    }

    await createSupabaseBroadcastStore().removeSegmentMembers(
      segmentId,
      userIds
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    return jsonError(error, "Failed to remove segment members.");
  }
}

async function parseUserIds(request: NextRequest): Promise<string[]> {
  const body = await parseJson(request);

  if (!isRecord(body)) {
    return [];
  }

  const identifiers = [
    ...stringArray(body.userIds),
    ...stringArray(body.users),
    stringValue(body.userId),
  ];
  const userIds = uniqueValidUserIds(identifiers);
  const emailUserIds = await resolveUserIdsByEmail(
    identifiers.filter((value) => value.includes("@") && !isValidUuid(value))
  );

  return uniqueValidUserIds([...userIds, ...emailUserIds]);
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return value
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function resolveUserIdsByEmail(emails: string[]): Promise<string[]> {
  const normalizedEmails = [
    ...new Set(emails.map((email) => email.trim().toLowerCase()).filter(Boolean)),
  ];

  if (normalizedEmails.length === 0) {
    return [];
  }

  const { data, error } = await createSupabaseAdminClient().auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) {
    throw error;
  }

  return data.users
    .filter((user) =>
      user.email ? normalizedEmails.includes(user.email.toLowerCase()) : false
    )
    .map((user) => user.id);
}
