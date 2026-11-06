import * as s from "@lib/json/schema"
import { Id } from "@lib/id"
import { api } from "@api/endpoints"
import { db, sql, type DbError } from "@lib/db"
import { audit } from "@lib/audit"
import { authorize } from "@lib/auth"
import { lockCredential } from "@lib/credentials"
import { DateOnly } from "@lib/time"
import { Future } from "@lib/future"
import { json, failure, respond, fromDb } from "@lib/http"
import { shiftById, toApiShift } from "@lib/shifts"

const EXPIRED = "Credential expired, cannot claim shift" // tech spec, exact (FR-4.1)
const NOT_FOUND = "Shift not found"
const FILLED = "Shift already filled"

const done = (response: Response): Future<DbError, Response> => Future.resolve(response)

export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/claim">): Promise<Response> {
  const { id: rawId } = await ctx.params
  const id = new Id<"Shift">(rawId)
  return respond(
    authorize(request, ["nurse"]).chain((nurse) => {
      const nurseId = nurse.id
      return db
        .transaction((tx) =>
          shiftById(tx, id).chain((shift) =>
            shift === null ?
              done(failure(404, NOT_FOUND))
              // FR-4.4: valid only if the approved expiry is on or after both UTC today and the day the shift
              // ends (the next day for an overnight shift). The expiry date itself counts. No credential row means blocked.
            : lockCredential(tx, nurseId)
                .chain(() =>
                  tx.maybeOne(
                    sql`SELECT expires_on >= ${DateOnly.todayUTC().pretty()}::date
                        AND expires_on >= ${shift.date}::date + ${shift.end_time < shift.start_time ? 1 : 0}::int AS eligible
                      FROM credentials WHERE nurse_id = ${nurseId.value} FOR SHARE`,
                    s.object({ eligible: s.boolean })
                  )
                )
                .chain((credential) =>
                  !credential?.eligible ?
                    // FR-8.3: a blocked claim changes nothing and adds only its entry, which commits.
                    audit(tx, {
                      actorId: nurseId,
                      action: "claim.blocked",
                      recordId: id.value,
                      reason: null,
                      previousNurseId: null,
                    }).map(() => failure(403, EXPIRED))
                    // FR-3.5: the row lock plus `claimed_by IS NULL` lets exactly one concurrent claim through.
                  : tx
                      .execute(
                        sql`UPDATE shifts SET claimed_by = ${nurseId.value} WHERE id = ${id.value} AND claimed_by IS NULL`
                      )
                      .chain((updated) =>
                        updated === 0 ?
                          done(failure(409, FILLED)) // no entry: FR-8.2 doesn't list a lost race
                        : audit(tx, {
                            actorId: nurseId,
                            action: "shift.claimed",
                            recordId: id.value,
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
