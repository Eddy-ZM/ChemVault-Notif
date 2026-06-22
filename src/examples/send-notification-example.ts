import type { NotificationPayload } from "@/lib/notifications/types";

interface SendExtractionNotificationInput {
  userId: string;
  projectId: string;
  taskId: string;
  fileName: string;
}

export async function sendExtractionCompletedNotification({
  userId,
  projectId,
  taskId,
  fileName,
}: SendExtractionNotificationInput) {
  const payload: NotificationPayload = {
    userId,
    title: "AI extraction completed",
    body: "Your uploaded paper has been processed successfully.",
    type: "success",
    source: "ai-extractor",
    link: `/projects/${projectId}/results`,
    metadata: {
      projectId,
      taskId,
      fileName,
    },
  };

  const response = await fetch(
    `${process.env.CHEMVAULT_APP_URL}/api/notifications`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-chemvault-internal-key":
          process.env.CHEMVAULT_INTERNAL_API_KEY ?? "",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `ChemVault notification API failed with ${response.status}: ${errorText}`
    );
  }

  return response.json();
}
