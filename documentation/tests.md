# Verification Map

## Existing coverage

| Use case | Rule/negative case | Evidence | Status |
| --- | --- | --- | --- |
| Event contract | Unknown source/type/version/link/secret rejected | contract/API tests | CI required |
| Idempotency | Replay does not create duplicate inbox state | event tests | CI required |
| User scope/admin | User sees own state; privileged surfaces require permission | auth/admin tests and build | CI required |
| Forms minimization | Ticket metadata allowed; reporter/body/email excluded | Forms event tests | CI required |
| Lifecycle/legacy boundary | User state deletion idempotent; legacy workspace writes gone/410 | lifecycle/compat tests | CI required |

## Proposed tests

| Test | Type | Expected result |
| --- | --- | --- |
| Producer → inbox → deep link | Guarded live | One event creates one user notification and target reauthorizes resource |
| Push unsubscribe/provider failure | Automated integration | No delivery after opt-out; provider failure records bounded retry state |
| Broadcast audience review | Manual release | Audience/owner/content/link and rollback are approved before send |

## Gaps

- Provider push delivery and browser/device permission behavior need deployed/device evidence.
- Old-route traffic must be measured before compatibility redirects are removed.
- CI gates Vitest, typecheck, and production build; provider secrets require guarded canaries.
