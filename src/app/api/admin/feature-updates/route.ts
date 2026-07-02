import { NextRequest, NextResponse } from "next/server";
import { jsonError } from "@/lib/api/responses";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { createFeatureUpdate } from "@/lib/feature-updates/create-feature-update";
import {
  createSupabaseFeatureUpdateStore,
  normalizeFeatureUpdateFilters,
  normalizeFeatureUpdateTargetInput,
} from "@/lib/feature-updates/feature-update-store";
import {
  isFeatureUpdateCategory,
  isFeatureUpdateVisibility,
} from "@/lib/feature-updates/transform";
import { NotificationError } from "@/lib/notifications/errors";
import type { FeatureUpdateMetadata } from "@/types/feature-updates";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdminUser();
    const updates = await createSupabaseFeatureUpdateStore().listAdminUpdates(
      normalizeFeatureUpdateFilters(request.nextUrl.searchParams)
    );
    return NextResponse.json({ updates });
  } catch (error) {
    return jsonError(error, "Failed to load feature updates.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminUser();
    const body = await parseJson(request);
    const update = await createFeatureUpdate({
      ...parseFeatureUpdateInput(body),
      createdBy: user.id,
    });

    return NextResponse.json({ update }, { status: 201 });
  } catch (error) {
    return jsonError(error, "Failed to create feature update.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseFeatureUpdateInput(body: unknown) {
  if (!isRecord(body)) {
    throw new NotificationError("Request body is required.", undefined, 400);
  }

  const title = stringValue(body.title);
  const summary = stringValue(body.summary);
  const content = stringValue(body.content);
  const category = stringValue(body.category) || "new_feature";
  const visibility = stringValue(body.visibility) || "public";

  if (!title) {
    throw new NotificationError("title is required.", undefined, 400);
  }

  if (!summary) {
    throw new NotificationError("summary is required.", undefined, 400);
  }

  if (!content) {
    throw new NotificationError("content is required.", undefined, 400);
  }

  if (!isFeatureUpdateCategory(category)) {
    throw new NotificationError("Invalid category.", undefined, 400);
  }

  if (!isFeatureUpdateVisibility(visibility)) {
    throw new NotificationError("Invalid visibility.", undefined, 400);
  }

  return {
    title,
    summary,
    content,
    category,
    visibility,
    version: stringValue(body.version) || null,
    releaseDate: stringValue(body.releaseDate) || null,
    targets: arrayValue(body.targets)
      .map(normalizeFeatureUpdateTargetInput)
      .filter((target): target is NonNullable<typeof target> => Boolean(target)),
    metadata: jsonObject(body.metadata),
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function jsonObject(value: unknown): FeatureUpdateMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as FeatureUpdateMetadata;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
