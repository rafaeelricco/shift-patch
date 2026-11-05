export { credentialSummary }

import * as s from "@lib/json/schema"
import { sql, type Db, type DbError } from "@lib/db"
import type { Future } from "@lib/future"
import { DateOnly } from "@lib/time"
import { facilityToday } from "@lib/facility"
import type { CredentialSummary } from "@api/endpoints"

const schema_approved = s.object({ expires_on: DateOnly.schema, valid: s.boolean })
const schema_latest = s.object({
  id: s.string,
  expires_on: DateOnly.schema,
  status: s.stringEnum(["pending", "approved", "rejected"]),
  file_name: s.string,
})

/** FR-7.5. "valid" uses the same facility today as FR-4.4. Pass the route's `tx` to read its own write. */
function credentialSummary(db: Db, nurseId: string): Future<DbError, CredentialSummary> {
  const today = facilityToday().pretty()
  return db
    .maybeOne(
      sql`SELECT expires_on, expires_on >= ${today}::date AS valid FROM credentials WHERE nurse_id = ${nurseId}`,
      schema_approved
    )
    .chain((approved) =>
      db
        .maybeOne(
          sql`SELECT id, expires_on, status, file_name FROM credential_uploads
            WHERE nurse_id = ${nurseId} ORDER BY uploaded_at DESC, id DESC LIMIT 1`,
          schema_latest
        )
        .map((latest): CredentialSummary => ({
          approved:
            approved === null ? null : { expiresOn: approved.expires_on, state: approved.valid ? "valid" : "expired" },
          latest:
            latest === null ? null : (
              { id: latest.id, expiresOn: latest.expires_on, status: latest.status, fileName: latest.file_name }
            ),
        }))
    )
}
