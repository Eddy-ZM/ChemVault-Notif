# Critical flows

1. A producer signs a versioned event with the event-ingress credential.
2. Notifications validates type, source, timestamp, user, trusted deep link, and display-safe fields.
3. The idempotency key prevents duplicate notifications.
4. Forms triage events contain ticket metadata and an admin link only; form body, reporter identity, and email are not copied.
