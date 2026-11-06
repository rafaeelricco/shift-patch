import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db } from "@lib/db"
import { authorize } from "@lib/auth"
import { credentialSummary } from "@lib/credentials"
import { json, respond, fromDb } from "@lib/http"

// FR-7.5. Nurse only: the admin's review queue is an Admin-phase route.
export async function GET(request: Request): Promise<Response> {
  return respond(
    authorize(request, ["nurse"]).chain((nurse) =>
      credentialSummary(db, nurse.id).bimap(fromDb, (summary) => json(200, s.encode(api.credential.response, summary)))
    )
  )
}
