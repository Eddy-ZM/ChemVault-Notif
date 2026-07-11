# ChemVault Notifications product boundary

ChemVault Notifications is the suite's notification, message, announcement, and activity inbox. It is not an authoritative file manager or laboratory-results editor.

- ChemVault Files owns file upload, storage, download, sharing, rename, move, copy, and deletion.
- ChemVault Lab owns analysis creation, batch execution, result review, correction, datasets, and exports.
- ChemVault Notifications receives versioned service events and presents concise status updates with deep links back to the authoritative product.

Legacy project file, task, result, and dataset pages remain as redirect-compatible routes. Legacy write APIs return `410 Gone` with a canonical destination. Read-only projection APIs and internal compatibility ingestion may remain during migration, but new product work must use the event contract and authoritative service APIs.
