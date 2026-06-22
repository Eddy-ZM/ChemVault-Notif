# ChemVault Notification Center Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready standalone Next.js web MVP for ChemVault notifications.

**Architecture:** The app separates notification domain logic, Supabase clients, API handlers, and UI components. Server-side creation uses a service role client through `notify()`, while browser reads and updates use anon-key clients protected by RLS.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui primitives, Supabase PostgreSQL/Auth/Realtime, Vitest.

---

### Task 1: Scaffold the Web Application

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Create: `tailwind.config.ts`
- Create: `components.json`
- Create: `.env.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/app/globals.css`
- Create: `src/lib/utils.ts`

- [ ] Add strict TypeScript, Next.js scripts, Tailwind, shadcn aliases, and environment variable documentation.
- [ ] Install runtime and development dependencies.
- [ ] Run the shadcn CLI to add required UI primitives or create equivalent source components when CLI generation is not available.

### Task 2: Add Supabase Schema and Types

**Files:**
- Create: `supabase/migrations/20260622000000_create_notifications.sql`
- Create: `supabase/seed.sql`
- Create: `src/lib/supabase/database.types.ts`
- Create: `src/lib/notifications/types.ts`
- Create: `src/lib/notifications/transform.ts`

- [ ] Write tests for notification type validation and row-to-domain mapping.
- [ ] Create the migration with tables, constraints, indexes, grants, RLS policies, and realtime publication setup.
- [ ] Create development seed examples.
- [ ] Implement notification types and transform helpers.
- [ ] Verify tests fail before implementation and pass after implementation.

### Task 3: Add Supabase Clients and Server Notification Utility

**Files:**
- Create: `src/lib/env.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/notifications/errors.ts`
- Create: `src/lib/notifications/notify.ts`
- Test: `src/lib/notifications/notify.test.ts`

- [ ] Write tests for notification payload validation and insert error normalization.
- [ ] Implement browser, server, and admin Supabase clients.
- [ ] Implement `notify(payload)` with required-field validation, notification insert, created-event insert, and clean errors.
- [ ] Verify tests fail before implementation and pass after implementation.

### Task 4: Add Notification API Routes

**Files:**
- Create: `src/lib/notifications/filters.ts`
- Create: `src/app/api/notifications/route.ts`
- Create: `src/app/api/notifications/[id]/read/route.ts`
- Create: `src/app/api/notifications/read-all/route.ts`
- Test: `src/lib/notifications/filters.test.ts`

- [ ] Write tests for query parsing, limit clamping, read filters, and notification type validation.
- [ ] Implement authenticated list route with filters and unread count.
- [ ] Implement internal-key-protected create route.
- [ ] Implement mark-one-read and mark-all-read routes.
- [ ] Verify tests fail before implementation and pass after implementation.

### Task 5: Build Notification UI

**Files:**
- Create: `src/components/notifications/NotificationIcon.tsx`
- Create: `src/components/notifications/NotificationItem.tsx`
- Create: `src/components/notifications/NotificationDropdown.tsx`
- Create: `src/components/notifications/NotificationBell.tsx`
- Create: `src/components/notifications/NotificationCenterPage.tsx`
- Modify: `src/app/page.tsx`
- Create: `src/app/notifications/page.tsx`

- [ ] Build reusable notification presentation components.
- [ ] Implement dropdown fetch, mark-read, mark-all-read, navigation, realtime subscription, unread badge updates, and toast feedback.
- [ ] Implement `/notifications` filters, loading, error, and empty states.
- [ ] Keep layout responsive and suitable for a scientific SaaS dashboard.

### Task 6: Add Integration Example and Verification

**Files:**
- Create: `src/examples/send-notification-example.ts`
- Create: `README.md`

- [ ] Add ChemVault service integration example using `CHEMVAULT_INTERNAL_API_KEY`.
- [ ] Document migration commands, API test commands, `NotificationBell` placement, and required env vars.
- [ ] Run `npm run test`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Start the dev server and provide the local URL if it runs successfully.

### Self-Review

- Spec coverage: The plan covers schema, RLS, types, server creation, API routes, frontend components, realtime, seeds, examples, environment variables, and verification.
- Placeholder scan: No implementation step relies on an unspecified file or future feature.
- Scope check: The plan is limited to the web notification MVP and excludes chat, push, email, integrations, billing, mobile, and encryption.
