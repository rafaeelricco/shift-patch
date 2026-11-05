import { endSession } from "@lib/auth"
import { json, respond, fromDb } from "@lib/http"

/** Public and idempotent: ending no session, or an ended one, is still 200. SameSite=Lax keeps cross-site posts out. */
export async function POST(request: Request): Promise<Response> {
  return respond(
    endSession(request)
      .mapRej(fromDb)
      .map(() => json(200, {}))
  )
}
