import * as s from "@lib/json/schema"
import { Id } from "@lib/id"
import { api } from "@api/endpoints"
import { db, sql, type DbError } from "@lib/db"
import { audit } from "@lib/audit"
import { authorize } from "@lib/auth"
import { Future } from "@lib/future"
import { json, failure, readBody, respond, fromDb } from "@lib/http"
import { listShifts, shiftById, toApiShift } from "@lib/shifts"

const INVALID_SHIFT = "Shift needs role RN or LPN, a real YYYY-MM-DD date, and different HH:mm start and end times"

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

/**
 * FR-2.1 to FR-2.7: 401, then 403 for anyone but an agency, then 400. Agency and name come from the token only
 * (FR-1.6). Past dates and overnight shifts are allowed. `nextval` is not transactional, so a number is never reused,
 * even after a rollback or a seed reset. The entry commits with the shift (FR-8.2, FR-8.3).
 */
export async function POST(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["agency"]).chain((agency) =>
      readBody(request, api.postShift.request, INVALID_SHIFT).chain((body) =>
        body.startTime === body.endTime ?
          Future.resolve<Response, Response>(failure(400, INVALID_SHIFT))
        : db
            .transaction((tx) =>
              tx
                .one(
                  sql`INSERT INTO shifts (id, agency_id, role, date, start_time, end_time)
                    VALUES ('shift-' || nextval('shift_number'), ${agency.id.value}, ${body.role}, ${body.date},
                            ${body.startTime}, ${body.endTime})
                    RETURNING id`,
                  s.object({ id: Id.schema<"Shift">() })
                )
                .chain(({ id }) =>
                  audit(tx, {
                    actorId: agency.id,
                    action: "shift.posted",
                    recordId: id.value,
                    reason: null,
                    previousNurseId: null,
                  }).chain(() => shiftById(tx, id))
                )
                .chain((row): Future<DbError, Response> =>
                  row === null ?
                    Future.reject<DbError, Response>({ type: "UnexpectedRows", message: "posted shift not readable" })
                  : Future.resolve<DbError, Response>(json(201, s.encode(api.postShift.response, toApiShift(row))))
                )
            )
            .mapRej(fromDb)
      )
    )
  )
}
