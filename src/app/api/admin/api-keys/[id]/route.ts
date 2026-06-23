import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth/require-admin";
import { jsonError } from "@/lib/api/responses";
import { logAuditEvent } from "@/lib/audit/log-audit-event";
import { createSupabaseServiceApiKeyStore } from "@/lib/api-keys/api-key-store";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireAdminUser();
    const { id } = await context.params;
    const body = await parseJson(request);
    const active = activeValue(body);
    const key = await createSupabaseServiceApiKeyStore().updateActive(
      id,
      active
    );

    if (!active) {
      await logAuditEvent({
        actorUserId: user.id,
        actorType: "admin",
        action: "api_key.disabled",
        entityType: "service_api_key",
        entityId: key.id,
        source: "admin",
        severity: "warning",
        visibility: "admin",
        title: "API key disabled",
        description: `${key.serviceName} API key disabled.`,
        metadata: {
          serviceName: key.serviceName,
          scopes: key.scopes,
          allowedSources: key.allowedSources,
          keyPrefix: key.keyPrefix,
        },
      });
    }

    return NextResponse.json({
      id: key.id,
      active: key.active,
    });
  } catch (error) {
    return jsonError(error, "Failed to update API key.");
  }
}

async function parseJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function activeValue(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    !Array.isArray(body) &&
    (body as { active?: unknown }).active === true
  );
}
