export { audit, type AuditAction }

import { sql, type Db, type DbError } from "@lib/db"
import type { Future } from "@lib/future"

type AuditAction =
  | "shift.posted"
  | "shift.claimed"
  | "claim.blocked"
  | "shift.cancelled"
  | "credential.uploaded"
  | "credential.approved"
  | "credential.rejected"
  | "seed.reset"

// Callers pass the same `tx` as the change, so the entry and the change commit together (FR-8.3).
// previousNurseId is set only by cancellations (FR-6.6), so the admin log and the
// agency's "Reopened: …" line read who left from the entry itself.
function audit(
  tx: Db,
  entry: {
    actorId: string | null
    action: AuditAction
    recordId: string
    reason: string | null
    previousNurseId: string | null
  }
): Future<DbError, void> {
  return tx
    .execute(
      sql`INSERT INTO audit_log (actor_id, action, record_id, reason, previous_nurse_id)
        VALUES (${entry.actorId}, ${entry.action}, ${entry.recordId}, ${entry.reason}, ${entry.previousNurseId})`
    )
    .map(() => undefined)
}
