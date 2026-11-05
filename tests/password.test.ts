// @vitest-environment node
import { describe, expect, it } from "vitest"

import { hashPassword, verifyPassword } from "@lib/password"

const run = <T>(f: { promise: (g: (e: Error) => Error) => Promise<T> }) => f.promise((e) => e)

describe("password", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await run(hashPassword("Trial2026!"))
    expect(await run(verifyPassword("Trial2026!", hash))).toBe(true)
    expect(await run(verifyPassword("trial2026!", hash))).toBe(false)
  })

  it("salts each hash", async () => {
    const [a, b] = await Promise.all([run(hashPassword("x")), run(hashPassword("x"))])
    expect(a).not.toBe(b)
  })

  it("treats an unknown account and a malformed hash as a mismatch", async () => {
    expect(await run(verifyPassword("Trial2026!", null))).toBe(false)
    expect(await run(verifyPassword("Trial2026!", "plain"))).toBe(false)
  })
})
