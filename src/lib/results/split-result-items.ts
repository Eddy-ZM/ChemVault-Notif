import type { Json } from "@/lib/supabase/database.types";
import type {
  ExtractionResultItemType,
  ExtractionStructuredData,
  SplitResultItemInput,
} from "@/types/extraction-results";

const STRUCTURED_COLLECTIONS = [
  { key: "tables", itemType: "table" },
  { key: "compounds", itemType: "compound" },
  { key: "reactions", itemType: "reaction" },
  { key: "properties", itemType: "property" },
  { key: "measurements", itemType: "measurement" },
  { key: "experimental_conditions", itemType: "experimental_condition" },
  { key: "experimentalConditions", itemType: "experimental_condition" },
  { key: "references", itemType: "reference" },
  { key: "notes", itemType: "note" },
] as const satisfies Array<{
  key: string;
  itemType: ExtractionResultItemType;
}>;

export function splitResultItems(
  structuredData: ExtractionStructuredData | null | undefined
): SplitResultItemInput[] {
  if (!structuredData || Object.keys(structuredData).length === 0) {
    return [genericNoteItem("No structured extraction data was provided.")];
  }

  const items: SplitResultItemInput[] = [];

  for (const collection of STRUCTURED_COLLECTIONS) {
    const value = structuredData[collection.key];
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        items.push(toReviewItem(collection.itemType, entry, index));
      });
    } else if (value !== undefined && value !== null) {
      items.push(toReviewItem(collection.itemType, value, 0));
    }
  }

  if (items.length > 0) {
    return items;
  }

  return [
    {
      itemType: "note",
      label: "Structured output",
      value: sanitizeJson(structuredData),
      originalValue: sanitizeJson(structuredData),
      confidenceScore: confidenceFromRecord(structuredData),
      metadata: {
        sourceCollection: "unknown",
      },
    },
  ];
}

function toReviewItem(
  itemType: ExtractionResultItemType,
  entry: Json,
  index: number
): SplitResultItemInput {
  const record = isRecord(entry) ? entry : null;
  const value = sanitizeJson(entry);

  return {
    itemType,
    label: labelForItem(itemType, record, index),
    value,
    originalValue: sanitizeJson(record?.originalValue ?? record?.original_value ?? entry),
    confidenceScore: record ? confidenceFromRecord(record) : null,
    metadata: {
      sourceCollection: sourceCollectionForItemType(itemType),
      sourceIndex: index,
      ...(record?.page ? { page: record.page } : {}),
      ...(record?.source ? { source: record.source } : {}),
    },
  };
}

function genericNoteItem(message: string): SplitResultItemInput {
  return {
    itemType: "note",
    label: "Extraction output",
    value: { message },
    originalValue: { message },
    confidenceScore: null,
    metadata: {},
  };
}

function labelForItem(
  itemType: ExtractionResultItemType,
  record: Record<string, Json> | null,
  index: number
): string {
  const explicit =
    stringField(record, "label") ??
    stringField(record, "name") ??
    stringField(record, "title") ??
    stringField(record, "caption") ??
    stringField(record, "compound") ??
    stringField(record, "property") ??
    stringField(record, "reference");

  if (explicit) {
    return explicit;
  }

  return `${humanizeItemType(itemType)} ${index + 1}`;
}

function humanizeItemType(itemType: ExtractionResultItemType): string {
  return itemType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sourceCollectionForItemType(itemType: ExtractionResultItemType): string {
  if (itemType === "experimental_condition") {
    return "experimental_conditions";
  }

  return `${itemType}s`;
}

function confidenceFromRecord(record: Record<string, Json>): number | null {
  const value =
    numberField(record, "confidence_score") ??
    numberField(record, "confidenceScore") ??
    numberField(record, "confidence");

  if (value === null) {
    return null;
  }

  return Math.max(0, Math.min(1, value));
}

function stringField(
  record: Record<string, Json> | null,
  field: string
): string | null {
  const value = record?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberField(record: Record<string, Json>, field: string): number | null {
  const value = record[field];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function sanitizeJson(value: unknown): Json {
  if (value === undefined || typeof value === "function") {
    return null;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeJson);
  }

  if (isRecord(value)) {
    const output: Record<string, Json> = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry !== undefined && typeof entry !== "function") {
        output[key] = sanitizeJson(entry);
      }
    }
    return output;
  }

  return String(value);
}

function isRecord(value: unknown): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
