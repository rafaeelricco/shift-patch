export { authorize, resolveActor, startSession, endSession, type Role }

import { createHash, randomBytes } from "node:crypto"
import { schema_user } from "@api/endpoints"
import * as s from "@lib/json/schema"
import { db, sql, type Db, type DbError } from "@lib/db"
import { Future } from "@lib/future"
import { failure, fromDb } from "@lib/http"
import { Just, Nothing, type Maybe } from "@lib/maybe"
import { verifyToken, TOKEN_LIFETIME } from "@lib/token"
import { type Id } from "@lib/id"
import { type Actor, type UserActor } from "@lib/actor"

type Role = UserActor["role"]

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/
const EXPIRED = "Session expired, sign in again"
const ANONYMOUS: Actor = { type: "Anonymous" }
const SESSION_COOKIE = "sid"
const LIFETIME_SECONDS = TOKEN_LIFETIME.asSeconds() // fixed from sign-in, never slides; same as the JWT

/** 401 for a missing, malformed or expired credential (FR-1.4); 403 for a role not in `roles` (FR-1.5). Identity comes only from it (FR-1.6). */
function authorize(request: Request, roles: ReadonlyArray<Role>): Future<Response, UserActor> {
  return resolveActor(request)
    .mapRej(fromDb)
    .chain((actor) =>
      actor.type === "Anonymous" ? Future.reject<Response, UserActor>(failure(401, EXPIRED))
      : roles.includes(actor.role) ? Future.resolve<Response, UserActor>(actor)
      : Future.reject<Response, UserActor>(failure(403, "You don't have access to this"))
    )
}

/**
 * Who sent `request`, or `Anonymous`. An `Authorization` header is judged alone, so a bad one never falls back to the
 * cookie (FR-1.4). Both credentials require a live `auth_sessions` row. Rejects only on a database failure.
 */
function resolveActor(request: Request): Future<DbError, Actor> {
  const header = request.headers.get("authorization")
  if (header !== null) {
    const token = BEARER.exec(header)?.[1]
    if (token === undefined) return Future.resolve(ANONYMOUS)
    return verifyToken(token).bichain(
      () => Future.resolve<DbError, Actor>(ANONYMOUS),
      (actor) =>
        db
          .maybeOne(
            sql`SELECT true AS active FROM auth_sessions
              WHERE bearer_hash = ${digest(token)} AND account_id = ${actor.id.value}
                AND expires_at > now()`,
            s.object({ active: s.boolean })
          )
          .map<Actor>((session) => (session === null ? ANONYMOUS : actor))
    )
  }
  return readCookie(request, SESSION_COOKIE).maybe(Future.resolve<DbError, Actor>(ANONYMOUS), (token) =>
    db
      .maybeOne(
        sql`SELECT a.id, a.name, a.role FROM auth_sessions s JOIN accounts a ON a.id = s.account_id
          WHERE s.token_hash = ${digest(token)} AND s.expires_at > now()`,
        schema_user
      )
      // Unknown, expired and signed-out sessions are indistinguishable on purpose.
      .map((user): Actor => (user === null ? ANONYMOUS : { type: "User", ...user }))
  )
}

/**
 * Open a session for `accountId` inside the login transaction and return its `Set-Cookie` value. A fresh token every
 * time, never the request's (no session fixation). Expired rows are swept here, so no job is needed.
 */
function startSession(tx: Db, request: Request, accountId: Id<"User">, bearerToken: string): Future<DbError, string> {
  const token = randomBytes(32).toString("base64url")
  return tx
    .execute(sql`DELETE FROM auth_sessions WHERE expires_at <= now()`)
    .chain(() =>
      tx.execute(sql`INSERT INTO auth_sessions (token_hash, bearer_hash, account_id, expires_at)
        VALUES (${digest(token)}, ${digest(bearerToken)}, ${accountId.value},
          now() + make_interval(secs => ${LIFETIME_SECONDS}))`)
    )
    .map(() => {
      const secure = isHttps(request) ? "; Secure" : ""
      return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${LIFETIME_SECONDS}${secure}`
    })
}

/**
 * Delete the session selected by the request's credential, using the same header precedence as resolveActor.
 * A clearing `Set-Cookie` in a slow reply could delete a newer sign-in's cookie. The stale cookie resolves to `Anonymous`.
 */
function endSession(request: Request): Future<DbError, void> {
  const header = request.headers.get("authorization")
  if (header !== null) {
    const token = BEARER.exec(header)?.[1]
    if (token === undefined) return Future.resolve(undefined)
    return verifyToken(token).bichain(
      () => Future.resolve<DbError, void>(undefined),
      (actor) =>
        db
          .execute(
            sql`DELETE FROM auth_sessions
            WHERE bearer_hash = ${digest(token)} AND account_id = ${actor.id.value}
              AND expires_at > now()`
          )
          .map(() => undefined)
    )
  }
  return readCookie(request, SESSION_COOKIE).maybe(Future.resolve<DbError, void>(undefined), (token) =>
    db.execute(sql`DELETE FROM auth_sessions WHERE token_hash = ${digest(token)}`).map(() => undefined)
  )
}

function digest(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

function readCookie(request: Request, name: string): Maybe<string> {
  const pair = (request.headers.get("cookie") ?? "")
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
  const value = pair?.slice(name.length + 1) ?? ""
  return value === "" ? Nothing() : Just(value)
}

// The host terminates TLS (Vercel sets x-forwarded-proto); E2E serves plain http on 127.0.0.1.
function isHttps(request: Request): boolean {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https"
}
