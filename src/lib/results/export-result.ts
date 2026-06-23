import { logEvent } from "@/lib/audit/log-event";
import { NotificationError } from "@/lib/notifications/errors";
import { notify } from "@/lib/notifications/notify";
import type { NotificationPayload } from "@/lib/notifications/types";
import type { Json } from "@/lib/supabase/database.types";
import type {
  ExtractionExportType,
  ExtractionResult,
  ExtractionResultExport,
  ExtractionResultItem,
} from "@/types/extraction-results";
import {
  createSupabaseResultStore,
  type ResultStore,
} from "./result-store";
import { isExtractionExportType } from "./transform";

interface ExportResultInput {
  resultId: string;
  userId: string;
  exportType: ExtractionExportType | string;
}

interface ExportResultDependencies {
  store?: Pick<
    ResultStore,
    | "getResult"
    | "insertExport"
    | "insertReview"
    | "isProjectMember"
    | "listResultItems"
    | "updateResult"
  >;
  notifyFn?: (payload: NotificationPayload) => Promise<unknown>;
}

interface GeneratedExport {
  fileName: string;
  contentType: string;
  content: string;
}

export async function exportResult(
  input: ExportResultInput,
  dependencies: ExportResultDependencies = {}
): Promise<ExtractionResultExport> {
  const resultId = input.resultId?.trim();
  const userId = input.userId?.trim();
  const exportType = normalizeExportType(input.exportType);

  if (!resultId) {
    throw new NotificationError("resultId is required.", undefined, 400);
  }

  if (!userId) {
    throw new NotificationError("userId is required.", undefined, 400);
  }

  const store = dependencies.store ?? createSupabaseResultStore();
  const result = await store.getResult(resultId);

  if (!result) {
    throw new NotificationError("Extraction result not found.", undefined, 404);
  }

  await assertCanExport({ result, userId, store });

  if (!["in_review", "approved", "exported"].includes(result.status)) {
    throw new NotificationError(
      "Only reviewed or approved extraction results can be exported.",
      undefined,
      400
    );
  }

  const items = await store.listResultItems(result.id);
  const generated = generateExport({ result, items, exportType });
  const exportRecord = await store.insertExport({
    resultId: result.id,
    userId,
    exportType,
    metadata: {
      delivery: "inline",
      fileName: generated.fileName,
      contentType: generated.contentType,
      byteLength: Buffer.byteLength(generated.content, "utf8"),
      inlineContent: generated.content,
    },
  });

  await store.updateResult(result.id, {
    status: "exported",
    metadata: {
      ...result.metadata,
      lastExportId: exportRecord.id,
      lastExportType: exportType,
    },
  });
  await store.insertReview({
    resultId: result.id,
    reviewerId: userId,
    action: "comment_added",
    metadata: {
      actionType: "export_created",
      resultId: result.id,
      exportId: exportRecord.id,
      exportType,
    },
  });
  await logResultExport({
    result,
    exportRecord,
    userId,
  });
  await (dependencies.notifyFn ?? notify)({
    userId,
    title: "Result export created",
    body: "Your reviewed extraction result is ready to download.",
    type: "success",
    source: "chemvault-results",
    link: result.projectId
      ? `/projects/${result.projectId}/results/${result.id}`
      : `/results/${result.id}`,
    metadata: {
      resultId: result.id,
      exportId: exportRecord.id,
      exportType,
      projectId: result.projectId,
      pushPreviewAllowed: false,
    },
  });

  return exportRecord;
}

function normalizeExportType(value: ExtractionExportType | string) {
  if (!isExtractionExportType(value)) {
    throw new NotificationError(
      `Unsupported extraction result export type: ${value}.`,
      undefined,
      400
    );
  }

  return value;
}

async function assertCanExport(input: {
  result: ExtractionResult;
  userId: string;
  store: Pick<ResultStore, "isProjectMember">;
}) {
  if (
    input.result.userId === input.userId ||
    (input.result.projectId &&
      (await input.store.isProjectMember(input.result.projectId, input.userId)))
  ) {
    return;
  }

  throw new NotificationError("Extraction result export access required.", undefined, 403);
}

function generateExport(input: {
  result: ExtractionResult;
  items: ExtractionResultItem[];
  exportType: ExtractionExportType;
}): GeneratedExport {
  const baseName = `chemvault-result-${input.result.id}`;

  switch (input.exportType) {
    case "json":
      return {
        fileName: `${baseName}.json`,
        contentType: "application/json",
        content: JSON.stringify(
          {
            result: publicResult(input.result),
            items: input.items,
          },
          null,
          2
        ),
      };
    case "csv":
      return {
        fileName: `${baseName}.csv`,
        contentType: "text/csv",
        content: toCsv(input.items),
      };
    case "xlsx":
      return {
        fileName: `${baseName}.xlsx`,
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        content: toSpreadsheetXml(input.items),
      };
  }
}

function publicResult(result: ExtractionResult) {
  return {
    id: result.id,
    taskId: result.taskId,
    fileId: result.fileId,
    projectId: result.projectId,
    status: result.status,
    resultType: result.resultType,
    confidenceScore: result.confidenceScore,
    modelName: result.modelName,
    modelVersion: result.modelVersion,
    reviewedBy: result.reviewedBy,
    reviewedAt: result.reviewedAt,
    approvedBy: result.approvedBy,
    approvedAt: result.approvedAt,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  };
}

function toCsv(items: ExtractionResultItem[]): string {
  const rows = [
    ["item_id", "item_type", "label", "status", "confidence_score", "value_json"],
    ...items.map((item) => [
      item.id,
      item.itemType,
      item.label ?? "",
      item.status,
      item.confidenceScore?.toString() ?? "",
      JSON.stringify(item.value),
    ]),
  ];

  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function toSpreadsheetXml(items: ExtractionResultItem[]): string {
  const rows = [
    ["Item ID", "Type", "Label", "Status", "Confidence", "Value JSON"],
    ...items.map((item) => [
      item.id,
      item.itemType,
      item.label ?? "",
      item.status,
      item.confidenceScore?.toString() ?? "",
      JSON.stringify(item.value),
    ]),
  ];

  const xmlRows = rows
    .map(
      (row) =>
        `<Row>${row
          .map(
            (cell) =>
              `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`
          )
          .join("")}</Row>`
    )
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Worksheet ss:Name="ChemVault Result">
    <Table>${xmlRows}</Table>
  </Worksheet>
</Workbook>`;
}

function csvCell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function logResultExport(input: {
  result: ExtractionResult;
  exportRecord: ExtractionResultExport;
  userId: string;
}) {
  const metadata = {
    resultId: input.result.id,
    taskId: input.result.taskId,
    fileId: input.result.fileId,
    projectId: input.result.projectId,
    exportId: input.exportRecord.id,
    exportType: input.exportRecord.exportType,
  } satisfies Record<string, Json>;

  await logEvent({
    audit: {
      actorUserId: input.userId,
      actorType: "user",
      action: "extraction_result.export_created",
      entityType: "extraction_result_export",
      entityId: input.exportRecord.id,
      projectId: input.result.projectId,
      userId: input.result.userId,
      source: "chemvault-results",
      severity: "success",
      visibility: "admin",
      title: "Extraction result export created",
      metadata,
    },
    activity: input.result.projectId
      ? {
          projectId: input.result.projectId,
          actorUserId: input.userId,
          actorType: "user",
          eventType: "extraction_result.export_created",
          entityType: "extraction_result_export",
          entityId: input.exportRecord.id,
          title: "Result exported",
          description: "A reviewed extraction result export was created.",
          visibility: "project",
          severity: "success",
          metadata,
        }
      : null,
  });
}
