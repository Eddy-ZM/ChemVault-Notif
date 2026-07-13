# Permissions

| Operation | Anonymous | Signed-in user | Producer service | Administrator | Lifecycle service |
| --- | --- | --- | --- | --- | --- |
| Read/mark/delete notification | Deny | Own User ID only | Deny | Audited support scope | Delete only |
| Update preferences/push subscription | Deny | Own User ID only | Deny | Audited support scope | Delete only |
| Ingest event | Deny | Deny | Valid ingress secret and schema | Test through same contract | Deny |
| Broadcast/template/event inspection | Deny | Deny | Deny | Explicit permission | Deny |
| Legacy file/task/result mutation | Deny/redirect | Deny/redirect | Deny | Deny | Deny |

Application checks enforce scope; database credentials never grant browser authority. Trusted ChemVault HTTPS deep links are presentation metadata, not authorization to the target resource.
