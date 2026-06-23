async function sendResultCreatedWebhook({
  taskId,
  fileId,
  projectId,
  userId,
}: {
  taskId: string;
  fileId: string;
  projectId: string;
  userId: string;
}) {
  await fetch(`${process.env.CHEMVAULT_APP_URL}/api/webhooks/chemvault`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CHEMVAULT_SERVICE_API_KEY}`,
    },
    body: JSON.stringify({
      eventType: "result.created",
      source: "ai-extractor",
      taskId,
      projectId,
      idempotencyKey: `result-${taskId}`,
      payload: {
        taskId,
        fileId,
        projectId,
        userId,
        rawOutput: {
          modelResponseId: "resp_chemvault_seed",
        },
        structuredData: {
          tables: [
            {
              caption: "Catalyst screening yields",
              rows: [
                { catalyst: "Pd/C", yield_percent: 82 },
                { catalyst: "NiCl2", yield_percent: 61 },
              ],
              confidence_score: 0.91,
            },
          ],
          compounds: [
            {
              name: "4-bromoanisole",
              formula: "C7H7BrO",
              confidence_score: 0.94,
            },
          ],
        },
        modelName: "chemvault-extractor-v1",
        modelVersion: "2026-06-23",
        confidenceScore: 0.87,
        metadata: {
          worker: "ai-extractor",
        },
      },
    }),
  });
}

void sendResultCreatedWebhook({
  taskId: "10000000-0000-0000-0000-000000000001",
  fileId: "30000000-0000-0000-0000-000000000001",
  projectId: "20000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000001",
});
