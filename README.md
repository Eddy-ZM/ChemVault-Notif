# ChemVault Notification Center

Standalone Next.js web MVP for unified ChemVault notifications.

## Environment

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CHEMVAULT_INTERNAL_API_KEY=
CHEMVAULT_APP_URL=http://localhost:3000
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it to browser code.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Apply Supabase Migrations

With a linked Supabase project:

```bash
supabase db push
```

For local Supabase:

```bash
supabase start
supabase db reset
```

The migration creates:

- `public.notifications`
- `public.notification_events`
- RLS policies
- read-only event access for owners
- authenticated update access only for the `notifications.read` column
- realtime publication for `public.notifications`

`supabase/seed.sql` inserts development examples for user id
`00000000-0000-0000-0000-000000000001`.

## Test Internal Notification Creation

```bash
curl -X POST "$CHEMVAULT_APP_URL/api/notifications" \
  -H "Content-Type: application/json" \
  -H "x-chemvault-internal-key: $CHEMVAULT_INTERNAL_API_KEY" \
  -d '{
    "userId": "00000000-0000-0000-0000-000000000001",
    "title": "AI extraction completed",
    "body": "Your uploaded paper has been processed successfully.",
    "type": "success",
    "source": "ai-extractor",
    "link": "/projects/123/results",
    "metadata": {
      "projectId": "123",
      "taskId": "task-123",
      "fileName": "paper.pdf"
    }
  }'
```

Authenticated users can fetch their notifications:

```bash
curl "$CHEMVAULT_APP_URL/api/notifications?limit=30"
```

This request must include Supabase Auth cookies from a signed-in browser session.

## AI Extraction Task Workflow

The extraction task lifecycle is:

```text
uploaded -> queued -> processing -> extracting -> validating -> completed
                                                       \-> failed
```

Each status transition calls `updateExtractionTaskStatus()` and creates one user notification. Progress-only updates in the same status do not create a notification. `completed` and `failed` transitions always notify; failed notifications keep the user-facing body clean and store `errorMessage` in metadata.

Create a fake task for local testing:

```sql
insert into public.extraction_tasks (
  user_id,
  project_id,
  file_id,
  file_name,
  status,
  progress,
  metadata
) values (
  '00000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  gen_random_uuid(),
  'demo-paper.pdf',
  'queued',
  10,
  '{"modelName":"chemvault-extractor-v1"}'
)
returning id;
```

Then call the internal status update API:

```bash
curl -X POST "$CHEMVAULT_APP_URL/api/internal/extraction-tasks/<task-id>/status" \
  -H "Content-Type: application/json" \
  -H "x-chemvault-internal-key: $CHEMVAULT_INTERNAL_API_KEY" \
  -d '{
    "status": "completed",
    "progress": 100,
    "metadata": {
      "tablesExtracted": 8,
      "compoundsDetected": 14,
      "validationPassed": true
    }
  }'
```

View project tasks at:

```text
/projects/20000000-0000-0000-0000-000000000001/tasks
```

The AI worker integration example is in `src/examples/extraction-task-status-example.ts`.

## Embed `NotificationBell`

Place the component in an authenticated ChemVault dashboard header:

```tsx
import { NotificationBell } from "@/components/notifications/NotificationBell";

export function DashboardHeader() {
  return (
    <header className="flex items-center justify-between">
      <span>ChemVault</span>
      <NotificationBell />
    </header>
  );
}
```

## Verification

```bash
npm run test
npm run typecheck
npm run lint
npm run build
```
