import { NextRequest } from "next/server";

export function hasValidInternalKey(request: NextRequest): boolean {
  const expectedKey = process.env.CHEMVAULT_INTERNAL_API_KEY;
  const providedKey = request.headers.get("x-chemvault-internal-key");

  return Boolean(expectedKey && providedKey === expectedKey);
}
