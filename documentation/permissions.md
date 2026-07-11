# Permissions

Internal event ingestion requires `EVENT_INGRESS_SECRET`. User notifications are scoped by user ID. Webhook administration, broadcasts, templates, and event inspection require explicit administrator permissions.

Legacy project/file/result/task routes are compatibility surfaces and must not regain record-authority writes.
