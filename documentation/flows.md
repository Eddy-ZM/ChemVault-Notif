# Critical Flows

| Flow | Actor/precondition | Protected steps/side effects | Deny/failure behavior |
| --- | --- | --- | --- |
| Event ingestion | Approved producer with ingress secret | Validate schema/source/type/time/user/link, enforce idempotency, create inbox/audit state | Invalid secret/schema/link denied; duplicate key returns existing result |
| User inbox/preferences | Signed-in user | Derive User ID, list/mutate own delivery/read/preference state | Other user IDs ignored/denied |
| Push delivery | Valid stored notification and opted-in user | Load provider config/subscription, send bounded payload, record delivery result | Missing consent/provider/subscription does not leak or retry forever |
| Broadcast/product update | Explicit administrator | Validate audience/content/link, persist campaign and per-user delivery records | Non-admin denied; arbitrary external links rejected |
| Forms triage | Main Forms producer | Store ticket/status/category/admin link only | Body, reporter name, email, attachments, and secrets rejected/not copied |
| Lifecycle delete | User Center service | Remove owner presentation/subscription state idempotently | Dedicated credential required |
