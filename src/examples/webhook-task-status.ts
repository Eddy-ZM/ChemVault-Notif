export async function sendChemVaultTaskStatusWebhook({
  taskId,
}: {
  taskId: string;
}) {
  const response = await fetch(
    `${process.env.CHEMVAULT_APP_URL}/api/webhooks/chemvault`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CHEMVAULT_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        eventType: "task.status_changed",
        source: "ai-extractor",
        taskId,
        idempotencyKey: `task-${taskId}-completed`,
        payload: {
          taskId,
          status: "completed",
          progress: 100,
          metadata: {
            tablesExtracted: 8,
            compoundsDetected: 14,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Webhook failed: ${response.status}`);
  }

  return response.json();
}
