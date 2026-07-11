# Architecture

ChemVault Notifications is the event and notification delivery surface. Next.js APIs validate internal event envelopes, persist idempotent webhook events, create user notifications, maintain audit history, and expose administrative inspection.

Files and Lab remain authoritative for their business records; Notifications stores delivery and presentation state only.
