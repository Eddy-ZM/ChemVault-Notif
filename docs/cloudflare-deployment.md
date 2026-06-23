# ChemVault Notification Center Cloudflare Deployment

## Deployment Target

Use **OpenNext for Cloudflare Workers** for this project.

Cloudflare Pages static output is not the right target for the current app because
ChemVault uses Next.js App Router API routes for notifications, webhooks, internal
task/file/result endpoints, admin routes, Supabase server clients, and authenticated
server-side workflows.

The repository is configured with:

- Adapter: `@opennextjs/cloudflare`
- Worker config: `wrangler.jsonc`
- Worker entry: `.open-next/worker.js`
- Assets directory: `.open-next/assets`
- Project name: `chemvault-notify`
- Account ID: `20f69e8d2aebbadbff2b6ffa36efee50`
- Custom domain target: `notify.chemvault.science`

## Local Commands

Install dependencies:

```bash
npm install
```

Run the regular Next.js dev server:

```bash
npm run dev
```

Build the Cloudflare Worker bundle:

```bash
npm run cf:build
```

Preview the Cloudflare Worker locally:

```bash
npm run preview
```

Deploy to Cloudflare Workers after production environment variables are set:

```bash
npx wrangler login
npm run deploy
```

Validate the Worker bundle without deploying:

```bash
npm run cf:build
npx wrangler deploy --dry-run
```

## Cloudflare Settings

Use Workers, not a static Pages deployment.

- Cloudflare product: Workers & Pages
- Project type: Worker
- Worker name: `chemvault-notify`
- Build command: `npm run cf:build`
- Worker entry: `.open-next/worker.js`
- Static assets: `.open-next/assets`
- Node.js version for builds: 22, or 20 if your Cloudflare build environment does not offer 22
- Compatibility date: `2026-06-23`
- Compatibility flags: `nodejs_compat`

If you use Cloudflare Git builds, set the build command to:

```bash
npm run cf:build
```

and deploy using the OpenNext/Wrangler deploy step:

```bash
npx opennextjs-cloudflare deploy
```

For CLI deployment, `npm run deploy` performs both steps.

## Environment Variables

Set these in Cloudflare for production. `NEXT_PUBLIC_*` values are browser-visible
and must also be available at build time.

Public or non-secret variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
NEXT_PUBLIC_CHEMVAULT_FILES_BUCKET=project-files
CHEMVAULT_APP_URL=https://notify.chemvault.science
VAPID_SUBJECT=mailto:admin@chemvault.science
CHEMVAULT_ADMIN_EMAILS=admin@chemvault.science
```

`wrangler.jsonc` contains placeholder values for the browser-visible variables.
Replace those placeholders for production or provide the same values through the
Cloudflare build environment before running `npm run cf:build`.

Do not deploy while `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, or `NEXT_PUBLIC_VAPID_PUBLIC_KEY` still contain
placeholder values.

Secrets:

```text
SUPABASE_SERVICE_ROLE_KEY=
CHEMVAULT_INTERNAL_API_KEY=
VAPID_PRIVATE_KEY=
CHEMVAULT_SERVICE_API_KEY=
```

The Worker must exist before `wrangler secret put` can attach secrets. For a new
project, either create the Worker once after replacing the public placeholders,
or set these values in the Cloudflare dashboard immediately after the first
deploy.

Use Wrangler secrets for the secret values:

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put CHEMVAULT_INTERNAL_API_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put CHEMVAULT_SERVICE_API_KEY
```

Do not commit real secret values to `.env`, `.env.local`, `wrangler.jsonc`, or
Cloudflare build logs.

## Supabase Notes

- Browser and session clients use `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Server-side admin utilities use `SUPABASE_SERVICE_ROLE_KEY`.
- The service role key must only be configured as a server-side Cloudflare secret.
- RLS remains enforced for browser/session clients; admin server utilities should
  only be used in route handlers and server utilities.

## Web Push Runtime Note

The `web-push` npm package is a Node-oriented library. The app lazy-loads it and
fails gracefully if Cloudflare Workers cannot execute its internals in a given
runtime. In that case:

- in-app notifications still work,
- webhook/task/message/file/result workflows still work,
- push subscription APIs still work,
- actual Web Push sending can be moved later to a Node worker, queue consumer, or
  Supabase Edge Function if production runtime testing shows incompatibility.

## API Routes Expected To Run On Cloudflare

OpenNext builds the API routes into the Worker bundle. Important routes include:

- `GET /api/notifications`
- `POST /api/notifications`
- `PATCH /api/notifications/[id]/read`
- `PATCH /api/notifications/read-all`
- `POST /api/push/subscribe`
- `DELETE /api/push/unsubscribe`
- `POST /api/webhooks/chemvault`
- `POST /api/internal/extraction-tasks/[taskId]/status`
- `POST /api/internal/files/[fileId]/status`
- `POST /api/internal/extraction-results`
- project messaging, file, result, dataset, audit, broadcast, and admin APIs

## Custom Domain

Recommended production domain:

```text
notify.chemvault.science
```

Cloudflare dashboard steps:

1. Open Cloudflare Dashboard.
2. Go to Workers & Pages.
3. Select `chemvault-notify`.
4. Open Settings.
5. Add a route or custom domain for `notify.chemvault.science`.
6. Confirm DNS is proxied through Cloudflare.
7. Set `CHEMVAULT_APP_URL=https://notify.chemvault.science`.
8. Add `notify.chemvault.science` as a custom domain in the Cloudflare dashboard
   after the Worker deploys successfully. The route is intentionally not
   committed in `wrangler.jsonc` because accounts without the zone attached will
   fail deployment during domain record creation.

## Production Smoke Test

After deployment:

1. Open `https://notify.chemvault.science/notifications`.
2. Sign in through Supabase Auth.
3. Load `GET /api/notifications`.
4. Send a `notification.created` webhook through `/api/webhooks/chemvault`.
5. Confirm the notification appears in app.
6. Submit an internal extraction result through `/api/internal/extraction-results`.
7. Open a project result review page and approve a result.
8. Confirm an approved dataset appears under `/projects/[projectId]/datasets`.
