import * as s from "@lib/json/schema"
import { db, sql } from "@lib/db"
import { authorize } from "@lib/auth"
import { Future } from "@lib/future"
import { failure, respond, fromDb } from "@lib/http"

const schema_document = s.object({
  content_type: s.string,
  file_name: s.string,
  document: s.string,
})

export async function GET(
  request: Request,
  ctx: RouteContext<"/api/credentials/uploads/[id]/document">
): Promise<Response> {
  const { id } = await ctx.params
  return respond(
    authorize(request, ["nurse", "admin"]).chain((user) =>
      db
        .maybeOne(
          sql`SELECT content_type, file_name, encode(document, 'base64') AS document FROM credential_uploads
            WHERE id = ${id} ${user.role === "nurse" ? sql`AND nurse_id = ${user.id.value}` : sql``}`,
          schema_document
        )
        .mapRej(fromDb)
        .chain((row) =>
          row === null ?
            Future.reject(failure(404, "Document not found"))
          : Future.resolve(
              new Response(new Uint8Array(Buffer.from(row.document, "base64")), {
                status: 200,
                headers: {
                  "Content-Type": row.content_type,
                  "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`,
                  "Cache-Control": "private, no-store",
                  "X-Content-Type-Options": "nosniff",
                },
              })
            )
        )
    )
  )
}
