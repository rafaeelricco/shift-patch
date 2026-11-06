export { signToken, verifyToken, TOKEN_LIFETIME }

import { randomUUID } from "node:crypto"
import { SignJWT, jwtVerify } from "jose"

import * as s from "@lib/json/schema"
import { Future } from "@lib/future"
import { Duration } from "@lib/time"
import { schema_actor, type UserActor } from "@lib/actor"

const ALG = "HS256"
const TOKEN_LIFETIME = Duration.hours(8)

// Throws on a missing or short key: a configuration error, raised inside an async attemptP thunk.
function key(): Uint8Array {
  const secret = process.env["JWT_SECRET"]
  if (secret === undefined || secret.length < 32) throw new Error("JWT_SECRET must be at least 32 characters")
  return new TextEncoder().encode(secret)
}

// A fresh jti distinguishes two logins for the same account in the same second.
function signToken(user: UserActor): Future<Error, string> {
  // async, so a throw from key() becomes a rejection: Fluture's attemptP doesn't catch synchronous throws.
  return Future.attemptP(async () =>
    new SignJWT({ role: user.role, name: user.name })
      .setProtectedHeader({ alg: ALG, typ: "JWT" })
      .setSubject(user.id.value)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${TOKEN_LIFETIME.asSeconds()}s`)
      .sign(key())
  )
}

const schema_claims = s.object({ sub: s.string, role: s.string, name: s.string })

/** Rejects with a reason for logs only; callers answer every failure with the same 401. */
function verifyToken(token: string): Future<string, UserActor> {
  return Future.attemptP(async () => jwtVerify(token, key(), { algorithms: [ALG] }))
    .mapRej((e) => e.message)
    .chain(({ payload }) => Future.fromResult(s.decode(schema_claims, payload)))
    .chain((c) => Future.fromResult(s.decode(schema_actor, { type: "User", id: c.sub, name: c.name, role: c.role })))
    .chain((actor) =>
      actor.type === "User" ?
        Future.resolve<string, UserActor>(actor)
      : Future.reject<string, UserActor>("Not a user token")
    )
}
