import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"
import { authorize } from "@lib/auth"
import { json, respond, fromDb } from "@lib/http"
import { toApiShift } from "@lib/shifts"

const schema_row = s.object({
  id: s.string,
  agency_id: s.string,
  agency_name: s.string,
  role: s.stringEnum(["RN", "LPN"]),
  date: s.string,
  start_time: s.string,
  end_time: s.string,
  claimed_by: s.nullable(s.string),
  nurse_name: s.nullable(s.string),
})

// FR-5.1, FR-5.5: every shift with its covering nurse's name, admin only.
export async function GET(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["admin"]).chain(() =>
      db
        .rows(
          sql`SELECT s.id, s.agency_id, a.name AS agency_name, s.role, s.date, s.start_time, s.end_time, s.claimed_by,
              n.name AS nurse_name
            FROM shifts s JOIN accounts a ON a.id = s.agency_id LEFT JOIN accounts n ON n.id = s.claimed_by
            ORDER BY s.date, s.start_time, s.id`,
          schema_row
        )
        .bimap(fromDb, (rows) =>
          json(
            200,
            s.encode(api.adminShifts.response, {
              shifts: rows.map((r) => ({ ...toApiShift(r), nurseName: r.nurse_name })),
            })
          )
        )
    )
  )
}
