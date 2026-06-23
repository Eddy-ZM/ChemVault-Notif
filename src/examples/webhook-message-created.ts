export async function sendChemVaultMessageCreatedWebhook({
  conversationId,
  projectId,
}: {
  conversationId: string;
  projectId: string;
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
        eventType: "message.created",
        source: "ai-extractor",
        conversationId,
        projectId,
        idempotencyKey: `message-${conversationId}-tables-detected`,
        payload: {
          conversationId,
          senderType: "ai",
          body: "AI extraction detected 12 tables.",
          metadata: {
            projectId,
            notificationTitle: "AI extraction update",
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
