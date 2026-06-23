export async function sendChemVaultNotificationWebhook() {
  const response = await fetch(
    `${process.env.CHEMVAULT_APP_URL}/api/webhooks/chemvault`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.CHEMVAULT_SERVICE_API_KEY}`,
      },
      body: JSON.stringify({
        eventType: "notification.created",
        source: "ai-extractor",
        userId: "00000000-0000-0000-0000-000000000001",
        projectId: "20000000-0000-0000-0000-000000000001",
        idempotencyKey: "notification-demo-completed",
        payload: {
          userId: "00000000-0000-0000-0000-000000000001",
          title: "AI extraction completed",
          body: "Structured results are ready for review.",
          type: "success",
          source: "ai-extractor",
          link: "/projects/20000000-0000-0000-0000-000000000001/results",
          metadata: {
            projectId: "20000000-0000-0000-0000-000000000001",
            taskId: "10000000-0000-0000-0000-000000000001",
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
