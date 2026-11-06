import * as s from "@lib/json/schema"
import { Id } from "@lib/id"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"
import { authorize } from "@lib/auth"
import { json, respond, fromDb } from "@lib/http"
import { POSIX } from "@lib/time"

/** The table shows a working window rather than the whole append-only log (FR-8.4). */
const LIMIT = 200

const schema_row = s.object({
  id: Id.schema<"AuditEntry">(),
  at_ms: POSIX.schema,
  actor_id: s.nullable(Id.schema<"User">()),
  actor_name: s.nullable(s.string),
  action: s.string,
  record_id: s.string,
  reason: s.nullable(s.string),
  previous_nurse_id: s.nullable(Id.schema<"User">()),
  previous_nurse_name: s.nullable(s.string),
})

// FR-8.1, FR-6.6: newest first, admin only. LEFT JOINs keep the seed reset (null actor) and any id with no account.
export async function GET(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["admin"]).chain(() =>
      db
        .rows(
          sql`SELECT l.id::text AS id, (EXTRACT(EPOCH FROM l.at) * 1000)::float8 AS at_ms, l.actor_id,
              actor.name AS actor_name, l.action, l.record_id, l.reason, l.previous_nurse_id,
              prev.name AS previous_nurse_name
            FROM audit_log l
              LEFT JOIN accounts actor ON actor.id = l.actor_id
              LEFT JOIN accounts prev ON prev.id = l.previous_nurse_id
            ORDER BY l.at DESC, l.id DESC LIMIT ${LIMIT}`,
          schema_row
        )
        .bimap(fromDb, (rows) =>
          json(
            200,
            s.encode(api.auditLog.response, {
              entries: rows.map((r) => ({
                id: r.id,
                at: r.at_ms,
                actorId: r.actor_id,
                actorName: r.actor_name,
                action: r.action,
                recordId: r.record_id,
                reason: r.reason,
                previousNurseId: r.previous_nurse_id,
                previousNurseName: r.previous_nurse_name,
              })),
            })
          )
        )
    )
  )
}
