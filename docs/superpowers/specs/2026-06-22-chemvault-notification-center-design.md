# ChemVault Notification Center Web MVP Design

## Scope

Build `ChemVault Notification Center` as a standalone Next.js App Router web application in `/Users/edwardmu/ChemVault_suite/ChemVault-notif`.

This first web version includes:

- Supabase PostgreSQL migrations for notifications and notification events.
- Row Level Security policies that let users read their own notifications and update only their own `read` column.
- Server-side notification creation through a reusable `notify()` function and an internal API-key-protected API route.
- Authenticated user API routes for listing notifications and marking notifications read.
- A reusable `NotificationBell` with dropdown, unread badge, realtime updates, and toast feedback.
- A full `/notifications` page with filters, loading, empty, and error states.
- Development seed examples and an integration example for other ChemVault services.

This version does not include chat, web push, email, Slack/Discord, billing, native mobile, or encryption features.

## Architecture

The application uses Next.js App Router with TypeScript and Tailwind CSS. shadcn/ui source components provide the UI primitives. Supabase is split into three clients:

- Browser client: anon key only, used by client components and protected by RLS.
- Server client: anon key plus request cookies, used to authenticate current users in route handlers.
- Admin client: service role key, server-only, used by `notify()` and internal notification creation.

Notification domain code lives under `src/lib/notifications`. UI components live under `src/components/notifications`. API routes live under `src/app/api/notifications`.

## Data Model

`notifications` stores the current notification state:

- `id`, `user_id`, `title`, `body`, `type`, `source`, `link`, `read`, `metadata`, `created_at`

`notification_events` stores audit-style events:

- `id`, `notification_id`, `user_id`, `event_type`, `metadata`, `created_at`

Allowed notification types are `info`, `success`, `warning`, `error`, `message`, `system`, and `task`.

## Security

Authenticated users can select only rows where `auth.uid() = user_id`. Authenticated users can update only the `read` column on their own notification rows. They do not receive insert grants for either table.

Notification creation happens through server-side code only. `POST /api/notifications` requires `x-chemvault-internal-key` to match `CHEMVAULT_INTERNAL_API_KEY`, then calls `notify()` with the service role client.

The service role key is never imported by client components and must remain server-only.

## API

- `GET /api/notifications`: returns current user's notifications plus unread count. Supports `limit`, `unreadOnly`, `read`, `source`, and `type`.
- `POST /api/notifications`: internal-service notification creation, protected by `CHEMVAULT_INTERNAL_API_KEY`.
- `PATCH /api/notifications/[id]/read`: marks one notification as read for the current authenticated user.
- `PATCH /api/notifications/read-all`: marks all current authenticated user's notifications as read.

## Frontend

The web UI is a restrained scientific SaaS dashboard surface. The home page demonstrates where `NotificationBell` belongs in an app header. `/notifications` is the full notification center.

`NotificationBell` fetches the latest ten notifications, displays the unread count, subscribes to Supabase Realtime inserts for the current user, prepends new notifications, and cleans up the channel on unmount. Clicking an unread notification marks it read before navigating to its link.

`NotificationCenterPage` fetches filtered notifications, supports read/type/source filters, and reuses the same item presentation as the bell dropdown.

## Verification

Implementation must pass:

- TypeScript checks.
- Lint checks.
- Unit tests for notification validation, query parsing, and mapping helpers.
- A production build.

Supabase migrations are delivered as SQL files. Applying them requires a configured Supabase project or local Supabase CLI environment.

## Notes

This directory was not a git repository at design time, so the design document could not be committed.
