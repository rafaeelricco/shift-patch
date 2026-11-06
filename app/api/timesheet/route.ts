import * as s from "@lib/json/schema"
import { Id } from "@lib/id"
import { api } from "@api/endpoints"
import { db, sql, type Sql } from "@lib/db"
import { authorize } from "@lib/auth"
import { json, respond, fromDb } from "@lib/http"
import { scheduledDuration } from "@lib/scheduled-duration"
import type { UserActor } from "@lib/actor"

const schema_row = s.object({
  shift_id: Id.schema<"Shift">(),
  nurse_id: Id.schema<"User">(),
  nurse_name: s.string,
  agency_id: Id.schema<"User">(),
  agency_name: s.string,
  date: s.string,
  start_time: s.string,
  end_time: s.string,
})

/** FR-9.3: admin every row, agency its own shifts, nurse their own. */
function scope(user: UserActor): Sql {
  switch (user.role) {
    case "admin":
      return sql`TRUE`
    case "agency":
      return sql`s.agency_id = ${user.id.value}`
    case "nurse":
      return sql`s.claimed_by = ${user.id.value}`
    default:
      return user.role satisfies never
  }
}

export async function GET(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["nurse", "agency", "admin"]).chain((user) =>
      db
        .rows(
          // The inner join on claimed_by keeps filled shifts only (FR-9.1).
          sql`SELECT s.id AS shift_id, n.id AS nurse_id, n.name AS nurse_name, s.agency_id, a.name AS agency_name,
              s.date, s.start_time, s.end_time
            FROM shifts s JOIN accounts a ON a.id = s.agency_id JOIN accounts n ON n.id = s.claimed_by
            WHERE ${scope(user)} ORDER BY s.date DESC, s.start_time DESC, s.id`,
          schema_row
        )
        .bimap(fromDb, (rows) =>
          json(
            200,
            s.encode(api.timesheet.response, {
              rows: rows.map((r) => ({
                shiftId: r.shift_id,
                nurseId: r.nurse_id,
                nurseName: r.nurse_name,
                agencyId: r.agency_id,
                agencyName: r.agency_name,
                date: r.date,
                startTime: r.start_time,
                endTime: r.end_time,
                hours: scheduledDuration(r.start_time, r.end_time).asHours(),
              })),
            })
          )
        )
    )
  )
}
