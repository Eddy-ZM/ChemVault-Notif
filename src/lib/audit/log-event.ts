import type {
  AuditLog,
  CreateCombinedAuditEventInput,
  ProjectActivityEvent,
} from "@/types/audit";
import { logAuditEvent } from "./log-audit-event";
import { logProjectActivity } from "./log-project-activity";

export async function logEvent(
  input: CreateCombinedAuditEventInput
): Promise<{
  audit: AuditLog | null;
  activity: ProjectActivityEvent | null;
}> {
  const [audit, activity] = await Promise.all([
    input.audit ? logAuditEvent(input.audit) : Promise.resolve(null),
    input.activity ? logProjectActivity(input.activity) : Promise.resolve(null),
  ]);

  return { audit, activity };
}
