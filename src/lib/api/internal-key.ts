import { NextRequest } from "next/server";

export function hasValidInternalKey(request: NextRequest): boolean {
  const expectedKey = process.env.CHEMVAULT_INTERNAL_API_KEY;
  const providedKey = request.headers.get("x-chemvault-internal-key");

  return Boolean(expectedKey && providedKey === expectedKey);
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

export async function isValidLifecycleKeyValue(actual: string, expected: string): Promise<boolean> {
  if (!actual || !expected) return false;
  const [left, right] = await Promise.all([digest(actual), digest(expected)]);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    mismatch |= (left[index] || 0) ^ (right[index] || 0);
  }
  return mismatch === 0;
}

export async function hasValidLifecycleKey(request: NextRequest): Promise<boolean> {
  const expectedKey = process.env.LIFECYCLE_SERVICE_SECRET?.trim() || "";
  const authorization = request.headers.get("authorization") || "";
  const providedKey = authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "";
  return isValidLifecycleKeyValue(providedKey, expectedKey);
}
