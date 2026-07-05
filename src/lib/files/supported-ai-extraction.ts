const AI_EXTRACTION_MIME_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const AI_EXTRACTION_EXTENSION_MIME_TYPES: Record<string, string> = {
  ".csv": "text/csv",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

interface AiExtractionFileLike {
  mimeType?: string | null;
  fileName?: string | null;
  originalFileName?: string | null;
}

export function inferAiExtractionMimeType(
  file: AiExtractionFileLike
): string | null {
  const mimeType = normalizeMimeType(file.mimeType);

  if (mimeType && AI_EXTRACTION_MIME_TYPES.has(mimeType)) {
    return mimeType;
  }

  const extension = extensionFromFileName(file.fileName ?? file.originalFileName);
  return extension ? AI_EXTRACTION_EXTENSION_MIME_TYPES[extension] ?? null : null;
}

export function isSupportedForAiExtractionFile(file: AiExtractionFileLike) {
  return inferAiExtractionMimeType(file) !== null;
}

function normalizeMimeType(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

function extensionFromFileName(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  const index = normalized.lastIndexOf(".");
  return index >= 0 ? normalized.slice(index) : null;
}
