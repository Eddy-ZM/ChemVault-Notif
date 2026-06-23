import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { jsonError } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import {
  createSupabaseServiceApiKeyStore,
} from "@/lib/api-keys/api-key-store";
import {
  generateApiKey,
  getApiKeyPrefix,
  hashApiKey,
  type ApiKeyMode,
} from "@/lib/api-keys/hash-api-key";
import { NotificationError } from "@/lib/notifications/errors";
import {
  API_KEY_SCOPES,
  type ApiKeyScope,
  type ServiceApiKey,
} from "@/types/webhooks";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminUser();
    const keys = await createSupabaseServiceApiKeyStore().listKeys();
    return NextResponse.json({ apiKeys: keys.map(toSafeApiKey) });
  } catch (error) {
    return jsonError(error, "Failed to load API keys.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user } = await requireAdminUser();
    const body = await parseJson(request);
    const input = parseCreateApiKeyInput(body);
    const rawKey = generateApiKey({ mode: input.mode });
    const key = await createSupabaseServiceApiKeyStore().createKey({
      name: input.name,
      serviceName: input.serviceName,
      keyHash: hashApiKey(rawKey),
      keyPrefix: getApiKeyPrefix(rawKey),
      allowedSources: input.allowedSources,
      scopes: input.scopes,
      expiresAt: input.expiresAt,
      createdBy: user.id,
    });

    await logAuditEvent({
      actorUserId: user.id,
      actorType: "admin",
      action: "api_key.created",
      entityType: "service_api_key",
      entityId: key.id,
      source: "admin",
      severity: "info",
      visibility: "admin",
      title: "API key created",
      description: `${key.serviceName} API key created.`,
      metadata: {
        serviceName: key.serviceName,
        scopes: key.scopes,
        allowedSources: key.allowedSources,
        keyPrefix: key.keyPrefix,
      },
    });

    return NextResponse.json(
      {
        ...toSafeApiKey(key),
        rawKey,
      },
      { status: 201 }
    );
  } catch (error) {
    return jsonError(error, "Failed to create API key.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseCreateApiKeyInput(body: unknown) {
  if (!isRecord(body)) {
    throw new NotificationError("Request body is required.", undefined, 400);
  }

  const name = stringValue(body.name);
  const serviceName = stringValue(body.serviceName);
  const mode = body.mode === "live" ? "live" : "test";
  const scopes = stringArray(body.scopes).filter(
    (scope): scope is ApiKeyScope =>
      (API_KEY_SCOPES as readonly string[]).includes(scope)
  );

  if (!name) {
    throw new NotificationError("name is required.", undefined, 400);
  }

  if (!serviceName) {
    throw new NotificationError("serviceName is required.", undefined, 400);
  }

  if (scopes.length === 0) {
    throw new NotificationError("At least one scope is required.", undefined, 400);
  }

  return {
    name,
    serviceName,
    mode: mode as ApiKeyMode,
    scopes,
    allowedSources: stringArray(body.allowedSources),
    expiresAt: stringValue(body.expiresAt) || null,
  };
}

function toSafeApiKey(key: ServiceApiKey) {
  return {
    id: key.id,
    name: key.name,
    keyPrefix: key.keyPrefix,
    serviceName: key.serviceName,
    allowedSources: key.allowedSources,
    scopes: key.scopes,
    active: key.active,
    lastUsedAt: key.lastUsedAt,
    expiresAt: key.expiresAt,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}
