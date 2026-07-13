# Runtime Variables

| Name/group | Used by | Scope/source | Rotation | Failure/risk |
| --- | --- | --- | --- | --- |
| Supabase URL/anon key | Client/session-safe database access | Public client config | Project migration | Public values are not service authority |
| Supabase service credentials | Server persistence/admin | Server secret | 90 days/incident | Broad database authority; never bundle |
| User origin/session config | Identity and permissions | Server/public origin config | Service migration | Protected actions fail closed |
| `EVENT_INGRESS_SECRET` | Producer event API | Shared server secret | 90 days/incident | Events denied |
| Push provider keys/VAPID config | Push subscription/delivery | Public key plus server private secret | Provider policy/incident | Push unavailable |
| Lifecycle credential | User deletion | Shared server secret, distinct | 90 days/incident | Lifecycle denied |
| Trusted-origin allowlist | Deep-link validation | Server variable | Product-domain change | Unknown/external link denied |

Before production, verify producer-specific ownership, schema version, secret separation, push consent/unsubscribe, lifecycle canary, link allowlist, and redaction of sensitive Forms fields.
