import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql, type Db, type DbError } from "@lib/db"
import { Id } from "@lib/id"
import { Future } from "@lib/future"
import { json, failure, readBody, respond, fromDb } from "@lib/http"
import { signToken } from "@lib/token"
import { startSession } from "@lib/auth"
import { verifyPassword } from "@lib/password"

const INVALID = "Invalid email or password"
const MALFORMED = "Enter your email and password"
const THROTTLED = "Too many failed attempts, try again later"
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

function isThrottled(source: Db, key: string, address: string): Future<DbError, boolean> {
  return source
    .one(
      sql`SELECT count(*)::int AS n FROM login_failures
        WHERE email = ${key} AND address = ${address}
        AND at > now() - make_interval(mins => ${WINDOW_MINUTES})`,
      s.object({ n: s.number })
    )
    .map(({ n }) => n >= MAX_FAILURES)
}

/** Recheck the limit under the pair lock so concurrent failures cannot exceed it. */
function withLoginAttempt(
  key: string,
  address: string,
  write: (tx: Db) => Future<DbError, Response>
): Future<DbError, Response> {
  return db.transaction((tx) =>
    tx
      .execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`${key}|${address}`}))`)
      .chain(() => isThrottled(tx, key, address))
      .chain((blocked) => (blocked ? Future.resolve<DbError, Response>(failure(429, THROTTLED)) : write(tx)))
  )
}

export async function POST(request: Request): Promise<Response> {
  const address = clientAddress(request)
  return respond(
    readBody(request, api.login.request, MALFORMED).chain(({ email, password }) => {
      const key = email.trim().toLowerCase()
      return db
        .execute(
          sql`DELETE FROM login_failures
            WHERE at <= now() - make_interval(mins => ${WINDOW_MINUTES})`
        )
        .chain(() => isThrottled(db, key, address))
        .chain((blocked) => {
          if (blocked) return Future.resolve<DbError, Response>(failure(429, THROTTLED))

          return db
            .maybeOne(sql`SELECT id, role, name, password_hash FROM accounts WHERE email = ${key}`, schema_account)
            .chain((account) =>
              verifyPassword(password, account?.password_hash ?? null)
                .mapRej(internal)
                .chain((ok) => {
                  if (account === null || !ok) {
                    return withLoginAttempt(key, address, (tx) =>
                      tx
                        .execute(sql`INSERT INTO login_failures (email, address) VALUES (${key}, ${address})`)
                        .map(() => failure(401, INVALID))
                    )
                  }

                  const user = { id: account.id, name: account.name, role: account.role }
                  return signToken({ type: "User", ...user })
                    .mapRej(internal)
                    .chain((token) =>
                      withLoginAttempt(key, address, (tx) =>
                        startSession(tx, request, account.id, token).map((cookie) =>
                          json(200, s.encode(api.login.response, { token, user }), { "Set-Cookie": cookie })
                        )
                      )
                    )
                })
            )
        })
        .mapRej(fromDb)
    })
  )
}
