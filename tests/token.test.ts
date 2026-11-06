// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SignJWT } from "jose"

import { Id } from "@lib/id"
import { signToken, verifyToken } from "@lib/token"
import type { UserActor } from "@lib/actor"

const SECRET = "test-secret-test-secret-test-secret-0123"
const maria: UserActor = { type: "User", id: new Id<"User">("nurse-1"), name: "Maria Lopez", role: "nurse" }
const key = (secret: string) => new TextEncoder().encode(secret)

const sign = (u: UserActor) => signToken(u).promise((e) => e)
const verify = (t: string) => verifyToken(t).promiseR()

describe("token", () => {
  beforeEach(() => {
    process.env["JWT_SECRET"] = SECRET
  })
  afterEach(() => {
    delete process.env["JWT_SECRET"]
  })

  it("round-trips id, name and role", async () => {
    const actor = (await verify(await sign(maria))).either(
      (e) => {
        throw new Error(e)
      },
      (a) => a
    )
    expect({ id: actor.id.value, name: actor.name, role: actor.role }).toEqual({
      id: "nurse-1",
      name: "Maria Lopez",
      role: "nurse",
    })
  })

  it("issues different tokens for the same account in the same second", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    try {
      expect(await sign(maria)).not.toBe(await sign(maria))
    } finally {
      vi.useRealTimers()
    }
  })

  it("rejects a token signed with another key", async () => {
    const other = await new SignJWT({ role: "admin", name: "X" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("admin-1")
      .setExpirationTime("1h")
      .sign(key("another-secret-another-secret-another-1"))
    expect(
      (await verify(other)).either(
        () => "rejected",
        () => "accepted"
      )
    ).toBe("rejected")
  })

  it("rejects alg none", async () => {
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")
    const none = `${enc({ alg: "none", typ: "JWT" })}.${enc({ sub: "admin-1", role: "admin", name: "X" })}.`
    expect(
      (await verify(none)).either(
        () => "rejected",
        () => "accepted"
      )
    ).toBe("rejected")
  })

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ role: "nurse", name: "Maria Lopez" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("nurse-1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(key(SECRET))
    expect(
      (await verify(expired)).either(
        () => "rejected",
        () => "accepted"
      )
    ).toBe("rejected")
  })

  it("rejects an unknown role", async () => {
    const odd = await new SignJWT({ role: "owner", name: "X" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("x")
      .setExpirationTime("1h")
      .sign(key(SECRET))
    expect(
      (await verify(odd)).either(
        () => "rejected",
        () => "accepted"
      )
    ).toBe("rejected")
  })

  it("rejects instead of throwing when JWT_SECRET is missing", async () => {
    delete process.env["JWT_SECRET"]
    expect(
      (await signToken(maria).promiseR()).either(
        () => "rejected",
        () => "accepted"
      )
    ).toBe("rejected")
  })
})
