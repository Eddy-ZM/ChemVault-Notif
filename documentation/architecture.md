# Architecture

ChemVault Notifications is the suite event, inbox, preference, push, broadcast, product-update, and deep-link delivery surface. Next.js/Cloudflare APIs validate producer envelopes, persist idempotent events and user presentation state, maintain audit history, and expose permissioned administration.

Files, Lab, User, Mail, and Forms remain authoritative for their records. Notifications stores only delivery/presentation metadata and trusted links back to those systems; legacy file/task/result pages are compatibility redirects, not a second workspace.

## Trust boundaries and risks

- Producers authenticate with an ingress credential and versioned schema; display text and deep links are revalidated.
- User inbox/preferences are scoped by verified User ID; administrator actions require explicit permissions.
- Push-provider keys, Supabase service credentials, lifecycle credentials, and ingress secrets stay server-side.
- Event payload minimization is load-bearing: Forms events never copy report body, reporter email, or other sensitive intake content.

There is no scheduled job or email delivery. Event/webhook/push automation is documented in `automation.md`.

## Related documents

- [Flows](flows.md)
- [Permissions](permissions.md)
- [Variables](variables.md)
- [Tests](tests.md)
- [Automation](automation.md)
