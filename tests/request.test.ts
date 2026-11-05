import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type Future } from "@lib/future"

const MARIA = { id: "nurse-1", name: "Maria Lopez", role: "nurse" }
const STORED = JSON.stringify(MARIA)
const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

function stubFetch(...replies: Array<Response>) {
  const mock = vi.fn<typeof fetch>()
  replies.forEach((reply) => mock.mockResolvedValueOnce(reply))
  vi.stubGlobal("fetch", mock)
  return mock
}

const settle = <E, T>(future: Future<E, T>): Promise<"Rejected" | "Resolved"> =>
  new Promise((resolve) => {
    future.fork(
      () => resolve("Rejected"),
      () => resolve("Resolved")
    )
  })

/** Session and request keep state at module level, so each load is a fresh visit to the app. */
async function load() {
  vi.resetModules()
  const session = await import("@lib/session")
  const request = await import("@api/request")
  const { api } = await import("@api/endpoints")
  return { ...session, ...request, api }
}

const cleanups: Array<() => void> = []

beforeEach(() => window.localStorage.clear())
afterEach(() => {
  cleanups.splice(0).forEach((off) => off())
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("call", () => {
  it("call(QueryEndpoint, params) sends GET to path(params) with no body and no Content-Type", async () => {
    const mock = stubFetch(json(200, { shifts: [] }))
    const app = await load()

    expect(await settle(app.call(app.api.listShifts, {}))).toBe("Resolved")

    const [path, init] = mock.mock.calls[0] ?? []
    expect(path).toBe("/api/shifts")
    expect(init?.method).toBe("GET")
    expect(init?.body).toBeNull()
    expect((init?.headers ?? {}) as Record<string, string>).not.toHaveProperty("Content-Type")
  })

  it("call(CommandEndpoint, params, body) POSTs the encoded body to path(params)", async () => {
    const shift = {
      id: "shift-2",
      agencyId: "agency-a",
      agencyName: "Sunrise Health Staffing",
      role: "LPN",
      date: "2026-10-03",
      startTime: "07:00",
      endTime: "19:00",
      status: "open",
      claimedBy: null,
      cancellation: { reason: "advance", previousNurseId: "nurse-1" },
    }
    const mock = stubFetch(json(200, shift))
    const app = await load()

    expect(await settle(app.call(app.api.cancelShift, { id: "shift-2" }, { reason: "advance" }))).toBe("Resolved")

    const [path, init] = mock.mock.calls[0] ?? []
    expect(path).toBe("/api/shifts/shift-2/cancel")
    expect(init?.method).toBe("POST")
    expect(init?.body).toBe('{"reason":"advance"}')
  })

  it("call(PlainEndpoint, body) still POSTs to its fixed path", async () => {
    const mock = stubFetch(json(401, { error: "Invalid email or password" }))
    const app = await load()

    await settle(app.call(app.api.login, { email: "a@b.c", password: "x" }))

    const [path, init] = mock.mock.calls[0] ?? []
    expect(path).toBe("/api/auth/login")
    expect(init?.method).toBe("POST")
  })

  it("a 401 notifies onUnauthorized, and a signed-in tab confirms it with /api/auth/me", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = stubFetch(
      json(200, { actor: { type: "User", ...MARIA } }),
      json(401, { error: "Session expired, sign in again" }),
      json(200, { actor: { type: "Anonymous" } })
    )
    const app = await load()
    cleanups.push(app.subscribeToSession(() => {}))
    await vi.waitFor(() => expect(mock).toHaveBeenCalledTimes(1))
    const heard = vi.fn()
    cleanups.push(app.onUnauthorized(heard))

    expect(await settle(app.call(app.api.listShifts, {}))).toBe("Rejected")

    expect(heard).toHaveBeenCalledTimes(1)
    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: true }))
    expect(mock.mock.calls.map(([path]) => path)).toEqual(["/api/auth/me", "/api/shifts", "/api/auth/me"])
  })
})
