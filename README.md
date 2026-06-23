# ChemVault Notification Center

Standalone Next.js web MVP for unified ChemVault notifications.

## Environment

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CHEMVAULT_INTERNAL_API_KEY=
CHEMVAULT_ADMIN_EMAILS=admin@chemvault.science
CHEMVAULT_SERVICE_API_KEY=
CHEMVAULT_APP_URL=http://localhost:3000
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:admin@chemvault.science
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. Do not expose it to browser code.
`VAPID_PRIVATE_KEY` is also server-only. Only `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
is exposed to the browser.

Generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

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
- `public.extraction_tasks`
- `public.push_subscriptions`
- `public.conversations`
- `public.conversation_members`
- `public.messages`
- `public.message_reads`
- `public.service_api_keys`
- `public.webhook_events`
- `public.webhook_event_logs`
- `public.user_segments`
- `public.user_segment_members`
- `public.broadcasts`
- `public.broadcast_recipients`
- `public.broadcast_audit_logs`
- RLS policies
- read-only event access for owners
- authenticated update access only for the `notifications.read` column
- authenticated push subscription read/create/delete access only for the owner
- project messaging access only for conversation members
- user message inserts only with `sender_type = "user"`
- internal-only server utilities for `admin`, `system`, `ai`, and `task` messages
- API key records with hashed keys only
- webhook event and processing logs
- admin-only broadcast and user segment tables
- realtime publication for `public.notifications`
- realtime publication for `public.messages`

`supabase/seed.sql` inserts development examples for user id
`00000000-0000-0000-0000-000000000001`.

## API Keys and Webhooks

Trusted ChemVault services should send cross-service events to:

```text
POST /api/webhooks/chemvault
Authorization: Bearer cv_test_...
```

API keys are created from `/admin/api-keys` by an authenticated admin. Admin
access is currently controlled by `CHEMVAULT_ADMIN_EMAILS`. Raw keys are shown
only once during creation; the database stores only SHA-256 hashes plus display
prefixes such as `cv_test_abcd...`.

Supported scopes:

- `notifications:create`
- `tasks:update`
- `messages:create`
- `webhooks:send`
- `admin:broadcast`
- `admin:broadcast:all`

Webhook event scope mapping:

- `notification.created` requires `notifications:create`
- `task.status_changed` requires `tasks:update`
- `message.created` requires `messages:create`
- `admin.broadcast` requires `admin:broadcast`
- webhook all-user broadcasts additionally require `admin:broadcast:all`

If an API key has `allowed_sources`, the webhook `source` must match one of
those values. Empty `allowed_sources` means any source is accepted for that key.

Example notification webhook:

```bash
curl -X POST "$CHEMVAULT_APP_URL/api/webhooks/chemvault" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CHEMVAULT_SERVICE_API_KEY" \
  -d '{
    "eventType": "notification.created",
    "source": "ai-extractor",
    "userId": "00000000-0000-0000-0000-000000000001",
    "projectId": "20000000-0000-0000-0000-000000000001",
    "idempotencyKey": "demo-notification-completed",
    "payload": {
      "userId": "00000000-0000-0000-0000-000000000001",
      "title": "AI extraction completed",
      "body": "Structured results are ready for review.",
      "type": "success",
      "source": "ai-extractor",
      "link": "/projects/20000000-0000-0000-0000-000000000001/results",
      "metadata": {
        "projectId": "20000000-0000-0000-0000-000000000001"
      }
    }
  }'
```

Webhook idempotency:

- Send `idempotencyKey` for every retryable event.
- Reusing the same `service_name + idempotencyKey` returns the existing event.
- Already processed events are not processed again, preventing duplicate
  notifications and messages.
- Failed events are preserved with `status = failed` and an error log. Automatic
  failed-event retry is not enabled yet.

Webhook event inspection pages:

```text
/admin/webhook-events
/admin/webhook-events/<event-id>
```

`admin.broadcast` webhook events may target explicit `userIds`, a `segmentId`,
or a broadcast-style `targetType`/`targetPayload`. The webhook endpoint rejects
`all_users` targets unless the API key also has `admin:broadcast:all`.

Example clients:

- `src/examples/webhook-send-notification.ts`
- `src/examples/webhook-task-status.ts`
- `src/examples/webhook-message-created.ts`

Webhook testing checklist:

1. Add your email to `CHEMVAULT_ADMIN_EMAILS`.
2. Open `/admin/api-keys` and create a `cv_test_` key.
3. Give it the needed scope and allowed source, such as `ai-extractor`.
4. Send `notification.created` and confirm the notification appears.
5. Enable browser push and confirm `notify()` also triggers Web Push.
6. Send `task.status_changed` and confirm the extraction task updates.
7. Confirm task notification and project task message appear when `projectId` exists.
8. Send `message.created` and confirm it appears in the conversation.
9. Retry the same `idempotencyKey` and confirm no duplicate notification/message is created.
10. Disable the API key and confirm the webhook returns 403.

## Admin Broadcasts and User Segments

Admin broadcast pages:

```text
/admin/broadcasts
/admin/broadcasts/new
/admin/broadcasts/<broadcast-id>
/admin/user-segments
/admin/user-segments/<segment-id>
```

Recipient resolution supports:

- `single_user` from `targetPayload.userId`
- `selected_users` from `targetPayload.userIds`
- `project_members` from project conversations and `conversation_members`
- `segment` from `user_segment_members`
- `all_users` from Supabase Auth users, only when `confirmAllUsers` is true

Broadcast delivery uses the existing `notify()` server function, so each
recipient gets the normal in-app notification, realtime bell update, and Web
Push attempt when enabled. Push body preview is generic unless
`targetPayload.pushPreviewAllowed` is explicitly true.

Safety rules:

- Preview recipients before sending from the admin composer.
- `all_users` requires typing `CONFIRM`, which sets `confirmAllUsers: true`.
- Sent and failed broadcasts are locked from draft editing.
- `broadcast_recipients` records each sent or failed recipient.
- `broadcast_audit_logs` records start, completion, and failure summaries.

Admin broadcast testing checklist:

1. Add your email to `CHEMVAULT_ADMIN_EMAILS` and sign in.
2. Open `/admin/user-segments` and create a manual segment.
3. Open the segment detail page and add two Supabase user IDs.
4. Open `/admin/broadcasts/new`, choose `User segment`, and select the segment.
5. Preview recipients and confirm the count/sample are correct.
6. Send the broadcast and confirm recipient notifications appear.
7. Confirm `broadcast_recipients` rows include notification IDs.
8. Confirm `broadcast_audit_logs` contains send start/completion entries.
9. Try `all_users` without typing `CONFIRM` and confirm preview/send fails.
10. Try editing a sent broadcast through the API and confirm it fails.
11. Visit admin pages as a non-admin and confirm access is blocked.

## Legacy Internal Notification Creation

The older `x-chemvault-internal-key` endpoints are retained for local and
compatibility testing. New ChemVault services should prefer the API key webhook
endpoint above.

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

## Project Messaging

Project messaging is a lightweight workspace layer, not a social chat surface.
Users can discuss a project, admins and internal services can post project
messages, and AI extraction status changes can write task updates into the
project conversation.

Open the full inbox:

```text
/conversations
```

Open or create a project conversation:

```text
/projects/20000000-0000-0000-0000-000000000001/messages
```

Authenticated users can send normal messages through:

```http
POST /api/conversations/<conversation-id>/messages
```

Internal services can post AI/task/system/admin messages:

```bash
curl -X POST "$CHEMVAULT_APP_URL/api/internal/messages" \
  -H "Content-Type: application/json" \
  -H "x-chemvault-internal-key: $CHEMVAULT_INTERNAL_API_KEY" \
  -d '{
    "conversationId": "50000000-0000-0000-0000-000000000001",
    "senderType": "ai",
    "body": "AI extraction detected 12 tables.",
    "metadata": {
      "projectId": "20000000-0000-0000-0000-000000000001",
      "notificationTitle": "AI extraction update"
    }
  }'
```

Message notifications use `notify()`. User/admin messages create `type:
message`, `source: project-chat`, link to `/conversations/<conversation-id>`,
and notify other conversation members only. The sender does not receive their
own message notification. AI/task/system messages use task or system
notification types and link to the project messages page when `projectId` is in
metadata.

Browser push previews stay private by default. Message notifications include
`metadata.pushPreviewAllowed = false`, so Web Push uses generic copy instead of
full message text.

AI extraction status updates call `notify()` and then write a `sender_type:
task` message into the project conversation when the task has a `projectId`.
Progress-only updates within the same status do not create duplicate task
messages.

Messaging test checklist:

1. Apply migrations and seed data.
2. Open `/projects/20000000-0000-0000-0000-000000000001/messages` while signed in.
3. Send a user message and confirm it appears in the thread.
4. Open `/conversations` and confirm the latest preview updates.
5. Use another member session or seeded member to confirm the sender does not receive their own notification.
6. Call `POST /api/internal/messages` with `senderType: "ai"` or `"task"`.
7. Confirm the AI/task message appears as a workflow update.
8. Confirm unread badges update in the conversation list.
9. Open the conversation and confirm `POST /api/conversations/<id>/read` clears unread state.

## Browser System Notifications

Web Push is a progressive enhancement. If a browser does not support Service
Workers, PushManager, or the Notifications API, in-app notifications still work.

Enable system notifications:

1. Configure `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT`.
2. Apply migrations so `public.push_subscriptions` exists.
3. Open `/notifications` while signed in.
4. Use the "System notifications" card to enable browser notifications.

When `notify()` creates an in-app notification, it also attempts to send a Web
Push notification to the user's saved subscriptions. Push failures are non-fatal:
the in-app notification is still created. By default, push payloads use private
fallback copy:

```json
{
  "title": "ChemVault",
  "body": "You have a new notification.",
  "link": "/notifications"
}
```

Actual notification title/body are sent only when
`metadata.pushPreviewAllowed === true`.

In development, `/notifications` shows a "Send test notification" button. It
calls `POST /api/notifications/test`, creates a test notification for the current
user, and sets `metadata.pushPreviewAllowed = true`.

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

## License

This repository is source-available but not open source. Public visibility is
for review and reference only; no rights are granted to use, copy, modify,
distribute, host, deploy, or create derivative works without prior written
permission from Ziwen Mu or the repository owner.

See [LICENSE](./LICENSE). All rights reserved.
