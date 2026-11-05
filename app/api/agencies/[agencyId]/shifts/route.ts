import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"
import { authorize } from "@lib/auth"
import { Future } from "@lib/future"
import { json, failure, respond, fromDb } from "@lib/http"
import { listShifts, toApiShift } from "@lib/shifts"

const FORBIDDEN = "You don't have access to this"
const deny = (response: Response): Future<Response, Response> => Future.resolve(response)

/**
 * FR-2.8 and FR-2.9: an agency reads its own shifts, and a nurse or another agency gets 403, even for an unknown ID,
 * so no agency can probe which IDs exist. An admin reads any agency, and an ID that is not an agency account is 404.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/agencies/[agencyId]/shifts">): Promise<Response> {
  const { agencyId } = await ctx.params
  const list = (): Future<Response, Response> =>
    listShifts(db, sql`s.agency_id = ${agencyId}`).bimap(fromDb, (rows) =>
      json(200, s.encode(api.agencyShifts.response, { agencyId, shifts: rows.map(toApiShift) }))
    )
  return respond(
    authorize(request, ["nurse", "agency", "admin"]).chain((user) => {
      switch (user.role) {
        case "nurse":
          return deny(failure(403, FORBIDDEN))
        case "agency":
          return user.id.value === agencyId ? list() : deny(failure(403, FORBIDDEN))
        case "admin":
          return db
            .maybeOne(
              sql`SELECT id FROM accounts WHERE id = ${agencyId} AND role = 'agency'`,
              s.object({ id: s.string })
            )
            .mapRej(fromDb)
            .chain((row) => (row === null ? deny(failure(404, "Agency not found")) : list()))
        default:
          return user.role satisfies never
      }
    })
  )
}
