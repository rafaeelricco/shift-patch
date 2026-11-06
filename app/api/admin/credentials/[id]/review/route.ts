export { POST }

import * as s from "@lib/json/schema"
import { Id } from "@lib/id"
import { api } from "@api/endpoints"
import { db, sql, type DbError } from "@lib/db"
import { authorize } from "@lib/auth"
import { audit } from "@lib/audit"
import { lockCredential } from "@lib/credentials"
import { Future } from "@lib/future"
import { DateOnly } from "@lib/time"
import { json, failure, readBody, respond, fromDb } from "@lib/http"

const schema_owner = s.object({ nurse_id: Id.schema<"User">() })
const schema_upload = s.object({
  expires_on: DateOnly.schema,
  status: s.stringEnum(["pending", "approved", "rejected"]),
})
const done = (response: Response): Future<DbError, Response> => Future.resolve(response)

async function POST(request: Request, ctx: RouteContext<"/api/admin/credentials/[id]/review">): Promise<Response> {
  const { id: rawId } = await ctx.params
  const id = new Id<"CredentialUpload">(rawId)
  return respond(
    authorize(request, ["admin"]).chain((admin) =>
      readBody(request, api.reviewCredential.request, "Choose approve or reject").chain(({ decision }) =>
        db
          .transaction((tx) =>
            // Never lock the upload before its nurse: replacement takes the nurse lock before deleting the upload.
            tx
              .maybeOne(sql`SELECT nurse_id FROM credential_uploads WHERE id = ${id.value}`, schema_owner)
              .chain((owner) =>
                owner === null ?
                  done(failure(404, "Credential upload not found"))
                : lockCredential(tx, owner.nurse_id)
                    .chain(() =>
                      tx.maybeOne(
                        sql`SELECT expires_on, status FROM credential_uploads WHERE id = ${id.value} FOR UPDATE`,
                        schema_upload
                      )
                    )
                    .chain((upload) =>
                      upload === null ? done(failure(404, "Credential upload not found"))
                      : upload.status !== "pending" ? done(failure(409, "Credential upload already reviewed"))
                      : tx
                          .execute(
                            sql`UPDATE credential_uploads SET status = ${decision}, reviewed_at = now() WHERE id = ${id.value}`
                          )
                          .chain(() =>
                            decision === "approved" ?
                              tx
                                .execute(
                                  sql`INSERT INTO credentials (nurse_id, expires_on)
                          VALUES (${owner.nurse_id.value}, ${upload.expires_on.pretty()}::date)
                          ON CONFLICT (nurse_id) DO UPDATE SET expires_on = EXCLUDED.expires_on`
                                )
                                .map(() => undefined)
                            : Future.resolve<DbError, void>(undefined)
                          )
                          .chain(() =>
                            audit(tx, {
                              actorId: admin.id,
                              action: decision === "approved" ? "credential.approved" : "credential.rejected",
                              recordId: id.value,
                              reason: null,
                              previousNurseId: null,
                            })
                          )
                          .map(() => json(200, s.encode(api.reviewCredential.response, { id, status: decision })))
                    )
              )
          )
          .mapRej(fromDb)
      )
    )
  )
}
