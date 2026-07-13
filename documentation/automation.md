# Automation

| Automation | Trigger/owner | Allowed inputs/calls | Hard guardrails and failure |
| --- | --- | --- | --- |
| Event ingestion | Producer service | Versioned allowlisted event; Notifications persistence only | Secret, source/type/schema/time/link validation, idempotency key, audit state |
| Push delivery | Persisted user notification and opt-in | Configured push provider for that subscription only | Consent, minimal payload, bounded retry, invalid subscription cleanup |
| Broadcast | Explicit administrator approval | Approved audience, display text, trusted deep link | Permission check, preview/audit, kill/disable path; no autonomous audience expansion |
| Lifecycle cleanup | User Center service | Delete notification/preference/subscription state for one user | Separate credential and idempotent terminal response |

No LLM or agent controls delivery. Producers propose display metadata; Notifications enforces schema, audience identity, trusted links, idempotency, and side effects.
