import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql, type DbError } from "@lib/db"
import { Id } from "@lib/id"
import { Future } from "@lib/future"
import { json, failure, readBody, respond, fromDb } from "@lib/http"
import { signToken } from "@lib/token"
import { startSession } from "@lib/auth"
import { verifyPassword } from "@lib/password"

const INVALID = "Invalid email or password"
const MALFORMED = "Enter your email and password"
const MAX_FAILURES = 20 // NFR-2: per email and client address, inside the window below
const WINDOW_MINUTES = 15

const schema_account = s.object({
  id: Id.schema<"User">(),
  role: s.stringEnum(["nurse", "agency", "admin"]),
  name: s.string,
  password_hash: s.string,
})

const internal = (e: Error): DbError => ({ type: "QueryFailed", code: null, message: e.message })

// Next has no client-IP API (version-15.md:614). Read only a header the host sets and the
// client cannot forge (x-real-ip on Vercel); never the leftmost x-forwarded-for entry.
function clientAddress(request: Request): string {
  const header = process.env["TRUSTED_IP_HEADER"] ?? "x-real-ip"
  const value = request.headers.get(header)?.split(",")[0]?.trim() ?? ""
  return value === "" ? "unknown" : value
}

export async function POST(request: Request): Promise<Response> {
  const address = clientAddress(request)
  return respond(
    readBody(request, api.login.request, MALFORMED).chain(({ email, password }) => {
      const key = email.trim().toLowerCase()
      // One transaction per attempt, holding a per-pair lock, so concurrent bad logins can't overshoot 20.
      return db
        .transaction((tx) =>
          tx
            .execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${key}|${address}`}))`)
            .chain(() =>
              tx.one(
                sql`SELECT count(*)::int AS n FROM login_failures
                  WHERE email = ${key} AND address = ${address}
                  AND at > now() - make_interval(mins => ${WINDOW_MINUTES})`,
                s.object({ n: s.number })
              )
            )
            .chain(({ n }) =>
              n >= MAX_FAILURES ?
                Future.resolve<DbError, Response>(failure(429, "Too many failed attempts, try again later"))
              : tx
                  .maybeOne(
                    sql`SELECT id, role, name, password_hash FROM accounts WHERE email = ${key}`,
                    schema_account
                  )
                  .chain((account) =>
                    verifyPassword(password, account?.password_hash ?? null)
                      .mapRej(internal)
                      .chain((ok) =>
                        account !== null && ok ?
                          signToken({ type: "User", id: account.id, name: account.name, role: account.role })
                            .mapRej(internal)
                            .chain((token) =>
                              // The body keeps FR-1.1's JWT for API clients; the browser rides the HttpOnly cookie.
                              startSession(tx, request, account.id).map((cookie) =>
                                json(
                                  200,
                                  s.encode(api.login.response, {
                                    token,
                                    user: { id: account.id, name: account.name, role: account.role },
                                  }),
                                  { "Set-Cookie": cookie }
                                )
                              )
                            )
                        : tx
                            .execute(sql`INSERT INTO login_failures (email, address) VALUES (${key}, ${address})`)
                            .map(() => failure(401, INVALID))
                      )
                  )
            )
        )
        .mapRej(fromDb)
    })
  )
}
