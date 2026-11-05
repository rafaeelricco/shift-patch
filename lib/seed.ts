export { resetToSeed }

import { db, sql, SAMPLE, type DbError } from "@lib/db"
import { audit } from "@lib/audit"
import { Future } from "@lib/future"

/**
 * Restores shifts and credential dates to the sample data, keeps the audit log, records the
 * reset and keeps the shift sequence (FR-10.1, FR-10.3). Login failures are cleared too, so one
 * E2E test's 429 can't leak into the next (decision).
 */
function resetToSeed(): Future<DbError, void> {
  return db.transaction((tx) =>
    tx
      .execute(sql`DELETE FROM shifts`)
      .chain(() =>
        Future.traverse(
          (x: (typeof SAMPLE.shifts)[number]) =>
            tx.execute(sql`INSERT INTO shifts (id, agency_id, role, date, start_time, end_time, claimed_by)
              VALUES (${x.id}, ${x.agencyId}, ${x.role}, ${x.date}, ${x.startTime}, ${x.endTime}, ${x.claimedBy})`),
          [...SAMPLE.shifts]
        )
      )
      .chain(() =>
        Future.traverse(
          (c: (typeof SAMPLE.credentials)[number]) =>
            tx.execute(sql`UPDATE credentials SET expires_on = ${c.expiresOn} WHERE nurse_id = ${c.nurseId}`),
          [...SAMPLE.credentials]
        )
      )
      .chain(() => tx.execute(sql`DELETE FROM login_failures`))
      // FR-10.1: removes every upload with its document, because the document is a column of the row.
      .chain(() => tx.execute(sql`DELETE FROM credential_uploads`))
      .chain(() =>
        audit(tx, { actorId: null, action: "seed.reset", recordId: "seed", reason: null, previousNurseId: null })
      )
  )
}
