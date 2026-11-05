import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"
import { authorize } from "@lib/auth"
import { json, respond, fromDb } from "@lib/http"
import { listShifts, toApiShift } from "@lib/shifts"

// FR-3.1 and assumption A1: any valid token, every shift of every status from both agencies, exactly { shifts }.
export async function GET(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["nurse", "agency", "admin"]).chain(() =>
      listShifts(db, sql`TRUE`).bimap(fromDb, (rows) =>
        json(200, s.encode(api.listShifts.response, { shifts: rows.map(toApiShift) }))
      )
    )
  )
}
