export { hashPassword, verifyPassword }

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

import { Future } from "@lib/future"

const N = 16384
const R = 8
const P = 1
const KEY_BYTES = 32
// Used when the email is unknown, so both FR-1.2 cases cost one scrypt run.
const DUMMY_SALT = Buffer.alloc(16, 7)

function derive(password: string, salt: Buffer): Future<Error, Buffer> {
  return Future.createUncancellable((reject, resolve) => {
    scrypt(password, salt, KEY_BYTES, { N, r: R, p: P, maxmem: 64 * 1024 * 1024 }, (err, key) =>
      err === null ? resolve(key) : reject(err)
    )
  })
}

/** `scrypt$N$r$p$salt$key`, base64 parts, a fresh 16-byte salt each time. */
function hashPassword(password: string): Future<Error, string> {
  const salt = randomBytes(16)
  return derive(password, salt).map(
    (key) => `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${key.toString("base64")}`
  )
}

/** `stored` is null for an unknown email; the work done is the same either way. */
function verifyPassword(password: string, stored: string | null): Future<Error, boolean> {
  const parts = stored?.split("$") ?? []
  const [scheme, n, r, p, salt, key] = parts
  const parsed =
    (
      parts.length === 6 &&
      scheme === "scrypt" &&
      n === `${N}` &&
      r === `${R}` &&
      p === `${P}` &&
      salt !== undefined &&
      key !== undefined
    ) ?
      { salt: Buffer.from(salt, "base64"), expected: Buffer.from(key, "base64") }
    : null
  return derive(password, parsed?.salt ?? DUMMY_SALT).map(
    (actual) => parsed !== null && actual.length === parsed.expected.length && timingSafeEqual(actual, parsed.expected)
  )
}
