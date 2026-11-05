import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql, type DbError } from "@lib/db"
import { audit } from "@lib/audit"
import { authorize } from "@lib/auth"
import { facilityToday } from "@lib/facility"
import { Future } from "@lib/future"
import { json, failure, respond, fromDb } from "@lib/http"
import { shiftById, toApiShift } from "@lib/shifts"

const EXPIRED = "Credential expired, cannot claim shift" // tech spec, exact (FR-4.1)
const NOT_FOUND = "Shift not found"
const FILLED = "Shift already filled"

const done = (response: Response): Future<DbError, Response> => Future.resolve(response)

export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/claim">): Promise<Response> {
  const { id } = await ctx.params
  return respond(
    authorize(request, ["nurse"]).chain((nurse) => {
      const nurseId = nurse.id.value
      return db
        .transaction((tx) =>
          shiftById(tx, id).chain((shift) =>
            shift === null ?
              done(failure(404, NOT_FOUND))
              // FR-4.4: valid only if the approved expiry is on or after both facility today and the day the shift
              // ends (the next day for an overnight shift). The expiry date itself counts. No credential row means blocked.
            : tx
                .one(
                  sql`SELECT EXISTS (
                    SELECT 1 FROM credentials c, shifts s
                    WHERE c.nurse_id = ${nurseId} AND s.id = ${id}
                      AND c.expires_on >= ${facilityToday().pretty()}::date
                      AND c.expires_on >= s.date + CASE WHEN s.end_time < s.start_time THEN 1 ELSE 0 END
                  ) AS eligible`,
                  s.object({ eligible: s.boolean })
                )
                .chain(({ eligible }) =>
                  !eligible ?
                    // FR-8.3: a blocked claim changes nothing and adds only its entry, which commits.
                    audit(tx, {
                      actorId: nurseId,
                      action: "claim.blocked",
                      recordId: id,
                      reason: null,
                      previousNurseId: null,
                    }).map(() => failure(403, EXPIRED))
                    // FR-3.5: the row lock plus `claimed_by IS NULL` lets exactly one concurrent claim through.
                  : tx
                      .execute(sql`UPDATE shifts SET claimed_by = ${nurseId} WHERE id = ${id} AND claimed_by IS NULL`)
                      .chain((updated) =>
                        updated === 0 ?
                          done(failure(409, FILLED)) // no entry: FR-8.2 doesn't list a lost race
                        : audit(tx, {
                            actorId: nurseId,
                            action: "shift.claimed",
                            recordId: id,
                            reason: null,
                            previousNurseId: null,
                          })
                            .chain(() => shiftById(tx, id))
                            .map((row) =>
                              row === null ?
                                failure(404, NOT_FOUND)
                              : json(200, s.encode(api.claimShift.response, toApiShift(row)))
                            )
                      )
                )
          )
        )
        .mapRej(fromDb)
    })
  )
}
