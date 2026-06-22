import type { ExtractionTaskStatus } from "@/lib/tasks/types";

interface SendExtractionTaskStatusInput {
  taskId: string;
  status: ExtractionTaskStatus;
  progress?: number;
  metadata?: Record<string, unknown>;
}

export async function sendExtractionTaskStatusUpdate({
  taskId,
  status,
  progress,
  metadata = {},
}: SendExtractionTaskStatusInput) {
  const response = await fetch(
    `${process.env.CHEMVAULT_APP_URL}/api/internal/extraction-tasks/${taskId}/status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-chemvault-internal-key":
          process.env.CHEMVAULT_INTERNAL_API_KEY ?? "",
      },
      body: JSON.stringify({
        status,
        progress,
        metadata,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ChemVault extraction task status API failed with ${response.status}: ${errorText}`
    );
  }

  return response.json();
}

export async function exampleCompletedExtractionTask(taskId: string) {
  return sendExtractionTaskStatusUpdate({
    taskId,
    status: "completed",
    progress: 100,
    metadata: {
      tablesExtracted: 8,
      compoundsDetected: 14,
      validationPassed: true,
    },
  });
}
