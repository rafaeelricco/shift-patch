export { json, failure, readBody, respond, fromDb }

import * as s from "@lib/json/schema"
import { Future } from "@lib/future"
import type { Json } from "@lib/json/types"
import type { DbError } from "@lib/db"

function json(status: number, body: Json, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } })
}

/** Every error body is exactly `{ error }` (NFR-1). */
function failure(status: number, message: string): Response {
  return json(status, { error: message })
}

function readBody<T>(request: Request, schema: s.Schema<T>, message: string): Future<Response, T> {
  return Future.attemptP(() => request.json())
    .mapRej(() => failure(400, message))
    .chain((raw: unknown) => Future.fromResult(s.decode(schema, raw)).mapRej(() => failure(400, message)))
}

/** Logs the cause server-side and never leaks it (NFR-2). */
function fromDb(e: DbError): Response {
  console.error("database", e.type, e.message)
  return failure(500, "Something went wrong, try again")
}

function respond(f: Future<Response, Response>): Promise<Response> {
  return new Promise((resolve) => {
    f.fork(resolve, resolve)
  })
}
