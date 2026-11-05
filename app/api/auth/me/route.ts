import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { resolveActor } from "@lib/auth"
import { json, respond, fromDb } from "@lib/http"

/** Public, like job-kit's whoAmI: a missing, expired or ended session answers `Anonymous`, never 401. */
export async function GET(request: Request): Promise<Response> {
  return respond(
    resolveActor(request)
      .mapRej(fromDb)
      .map((actor) => json(200, s.encode(api.whoAmI.response, { actor })))
  )
}
