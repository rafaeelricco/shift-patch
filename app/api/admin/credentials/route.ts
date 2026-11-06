export { GET }

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"
import { authorize } from "@lib/auth"
import { DateOnly, POSIX } from "@lib/time"
import { json, respond, fromDb } from "@lib/http"

const schema_row = s.object({
  id: s.string,
  nurse_name: s.string,
  file_name: s.string,
  expires_on: DateOnly.schema,
  uploaded_at: POSIX.schema,
})

async function GET(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["admin"]).chain(() =>
      db
        .rows(
          sql`SELECT u.id, a.name AS nurse_name, u.file_name, u.expires_on,
            (EXTRACT(EPOCH FROM u.uploaded_at) * 1000)::float8 AS uploaded_at
          FROM credential_uploads u JOIN accounts a ON a.id = u.nurse_id
          WHERE u.status = 'pending' ORDER BY u.uploaded_at, u.id`,
          schema_row
        )
        .bimap(fromDb, (rows) =>
          json(
            200,
            s.encode(api.pendingCredentials.response, {
              uploads: rows.map((row) => ({
                id: row.id,
                nurseName: row.nurse_name,
                fileName: row.file_name,
                expiresOn: row.expires_on,
                uploadedAt: row.uploaded_at,
              })),
            })
          )
        )
    )
  )
}
