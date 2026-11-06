import * as s from "@lib/json/schema"
import { Id } from "@lib/id"
import { api, type CancelReason } from "@api/endpoints"
import { db, sql, type DbError } from "@lib/db"
import { audit } from "@lib/audit"
import { authorize } from "@lib/auth"
import { Future } from "@lib/future"
import { Failure, type Result } from "@lib/result"
import { json, failure, respond, fromDb } from "@lib/http"
import { shiftById, toApiShift } from "@lib/shifts"
import type { UserActor } from "@lib/actor"

const INVALID_REASON = "Reason must be no-show or advance"
const schema_lock = s.object({ agency_id: Id.schema<"User">(), claimed_by: s.nullable(Id.schema<"User">()) })
const done = (response: Response): Future<DbError, Response> => Future.resolve(response)

type CancelBody = { reason: CancelReason }
/** The body as judged at step 400: a decode failure and a non-JSON body are both a Failure, never a rejection. */
type ReadBody = Result<string, CancelBody>

/** FR-6.3: assigned nurse, owning agency, admin. A nurse on an open shift passes here and gets 409 later (FR-6.4). */
function deny(user: UserActor, row: s.Infer<typeof schema_lock>): Response | null {
  switch (user.role) {
    case "admin":
      return null
    case "agency":
      return row.agency_id.value === user.id.value ? null : failure(403, "You don't have access to this")
    case "nurse":
      return row.claimed_by === null || row.claimed_by.value === user.id.value ?
          null
        : failure(403, "Shift no longer assigned to you")
    default:
      return user.role satisfies never
  }
}

export async function POST(request: Request, ctx: RouteContext<"/api/shifts/[id]/cancel">): Promise<Response> {
  const { id: rawId } = await ctx.params
  const id = new Id<"Shift">(rawId)
  return respond(
    authorize(request, ["nurse", "agency", "admin"]).chain((user) =>
      Future.attemptP(() => request.json())
        .map((raw): ReadBody => s.decode(api.cancelShift.request, raw))
        // Both type arguments are spelled out: inferred, the error type would be `unknown` and the `.chain` below,
        // which returns Future<Response, Response>, would not type-check.
        .chainRej(() => Future.resolve<Response, ReadBody>(Failure<string, CancelBody>("not JSON")))
        .chain((body) =>
          db
            .transaction((tx) =>
              tx
                .maybeOne(sql`SELECT agency_id, claimed_by FROM shifts WHERE id = ${id.value} FOR UPDATE`, schema_lock)
                .chain((row) => {
                  if (row === null) return done(failure(404, "Shift not found"))
                  const denied = deny(user, row)
                  if (denied !== null) return done(denied)
                  const previous = row.claimed_by
                  return body.either(
                    () => done(failure(400, INVALID_REASON)),
                    ({ reason }) =>
                      previous === null ?
                        done(failure(409, "Shift is already open"))
                      : tx
                          .execute(sql`UPDATE shifts SET claimed_by = NULL WHERE id = ${id.value}`) // reopens; never "cancelled" (FR-6.9)
                          // FR-6.6: the previous holder rides on the entry itself (audit_log.previous_nurse_id).
                          .chain(() =>
                            audit(tx, {
                              actorId: user.id,
                              action: "shift.cancelled",
                              recordId: id.value,
                              reason,
                              previousNurseId: previous,
                            })
                          )
                          .chain(() => shiftById(tx, id))
                          .map((shift) =>
                            shift === null ?
                              failure(404, "Shift not found")
                            : json(
                                200,
                                s.encode(api.cancelShift.response, {
                                  ...toApiShift(shift),
                                  cancellation: { reason, previousNurseId: previous },
                                })
                              )
                          )
                  )
                })
            )
            .mapRej(fromDb)
        )
    )
  )
}
