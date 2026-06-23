import type { Json } from "@/lib/supabase/database.types";
import type { AuditMetadata } from "@/types/audit";

const SECRET_KEY_PATTERN =
  /(?:api[_-]?key|authorization|bearer|cookie|secret|service[_-]?role|token|password|private[_-]?key)/i;

export function sanitizeAuditMetadata(
  metadata: AuditMetadata | null | undefined
): AuditMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  return sanitizeRecord(metadata);
}

function sanitizeRecord(record: Record<string, Json | undefined>): AuditMetadata {
  const result: AuditMetadata = {};

  for (const [key, value] of Object.entries(record)) {
    if (SECRET_KEY_PATTERN.test(key)) {
      result[key] = "[redacted]";
      continue;
    }

    result[key] = sanitizeValue(value);
  }

  return result;
}

function sanitizeValue(value: Json | undefined): Json {
  if (value === undefined) {
    return null;
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  return sanitizeRecord(value);
}
