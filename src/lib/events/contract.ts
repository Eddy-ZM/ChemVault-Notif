export interface ChemVaultEventEnvelope {
  specVersion: "1.0";
  id: string;
  type: "files.file.ready" | "lab.analysis.started" | "lab.analysis.completed" | "lab.analysis.failed" | "forms.submission.received";
  source: "chemvault-files" | "chemvault-lab" | "chemvault-forms";
  subject: string;
  time: string;
  user: { id: string };
  data: {
    title: string;
    summary: string;
    deepLink: string;
    analysisId?: string;
    fileId?: string;
    fileCount?: number;
    artifactLinks?: Record<string, string>;
    ticketId?: string;
    priority?: string;
  };
}

export function parseChemVaultEvent(value: unknown): ChemVaultEventEnvelope {
  if (!isRecord(value)) throw new Error("Event body must be an object.");
  if (value.specVersion !== "1.0") throw new Error("Unsupported event specVersion.");
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.subject) || !isIsoDate(value.time)) {
    throw new Error("Event id, subject, and ISO time are required.");
  }
  if (!isAllowedType(value.type) || !isAllowedSource(value.source)) throw new Error("Unsupported event type or source.");
  if (!isRecord(value.user) || !isNonEmptyString(value.user.id)) throw new Error("Event user.id is required.");
  if (!isRecord(value.data)) throw new Error("Event data is required.");
  if (!isNonEmptyString(value.data.title) || !isNonEmptyString(value.data.summary)) {
    throw new Error("Event data title and summary are required.");
  }
  if (!isTrustedDeepLink(value.data.deepLink)) throw new Error("Event deepLink must target a ChemVault HTTPS origin.");
  return value as unknown as ChemVaultEventEnvelope;
}

function isAllowedType(value: unknown): value is ChemVaultEventEnvelope["type"] {
  return ["files.file.ready", "lab.analysis.started", "lab.analysis.completed", "lab.analysis.failed", "forms.submission.received"].includes(String(value));
}

function isAllowedSource(value: unknown): value is ChemVaultEventEnvelope["source"] {
  return value === "chemvault-files" || value === "chemvault-lab" || value === "chemvault-forms";
}

function isTrustedDeepLink(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "chemvault.science" || url.hostname.endsWith(".chemvault.science"));
  } catch {
    return false;
  }
}

function isIsoDate(value: unknown): value is string {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
