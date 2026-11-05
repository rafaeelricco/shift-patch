import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type Future } from "@lib/future"

const USER = { id: "user-1", name: "Rae Nurse", role: "nurse" }
const OK_LOGIN = { token: "jwt-1", user: USER }
const STORED = JSON.stringify(OK_LOGIN)

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })

/** Replies in order; every call is recorded on the returned mock. */
function stubFetch(...replies: Array<Response>) {
  const mock = vi.fn<typeof fetch>()
  replies.forEach((reply) => mock.mockResolvedValueOnce(reply))
  vi.stubGlobal("fetch", mock)
  return mock
}

function sentHeaders(mock: ReturnType<typeof stubFetch>, call: number): Record<string, string> {
  const init = mock.mock.calls[call]?.[1]
  return (init?.headers ?? {}) as Record<string, string>
}

type Settled<E, T> = { type: "Rejected"; error: E } | { type: "Resolved"; value: T }

const settle = <E, T>(future: Future<E, T>): Promise<Settled<E, T>> =>
  new Promise((resolve) => {
    future.fork(
      (error) => resolve({ type: "Rejected", error }),
      (value) => resolve({ type: "Resolved", value })
    )
  })

/** Session and request keep state at module level, so each load is a fresh visit to the app. */
async function load() {
  vi.resetModules()
  const session = await import("@lib/session")
  const request = await import("@api/request")
  const s = await import("@lib/json/schema")
  const { PlainEndpoint } = await import("@lib/endpoint")
  const authenticated = new PlainEndpoint({
    path: "/api/shifts/list",
    request: s.object({}),
    response: s.object({}),
  })
  return { ...session, ...request, authenticated, ping: () => settle(request.call(authenticated, {})) }
}

const cleanups: Array<() => void> = []

function subscribe(app: { subscribeToSession: (listener: () => void) => () => void }, listener: () => void = () => {}) {
  const off = app.subscribeToSession(listener)
  cleanups.push(off)
  return off
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanups.splice(0).forEach((off) => off())
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("resolving the session", () => {
  it("is Checking on the server and before anyone subscribes", async () => {
    window.localStorage.setItem("session", STORED)
    const app = await load()
    expect(app.getServerSessionSnapshot()).toEqual({ type: "Checking" })
    expect(app.getSessionSnapshot()).toEqual({ type: "Checking" })
  })

  it("resolves a stored entry to SignedIn only after subscribe", async () => {
    window.localStorage.setItem("session", STORED)
    const app = await load()
    expect(app.getSessionSnapshot().type).toBe("Checking")
    subscribe(app)
    const session = app.getSessionSnapshot()
    expect(session.type === "SignedIn" && session.token).toBe("jwt-1")
    expect(session.type === "SignedIn" && session.user.id.value).toBe("user-1")
    expect(app.getServerSessionSnapshot()).toEqual({ type: "Checking" })
  })

  it.each([
    ["invalid JSON", "{not json"],
    ["an outdated shape", JSON.stringify({ token: "jwt-1", user: { userId: "user-1" } })],
    ["an unknown role", JSON.stringify({ token: "jwt-1", user: { ...USER, role: "owner" } })],
  ])("reads %s as SignedOut", async (_, entry) => {
    window.localStorage.setItem("session", entry)
    const app = await load()
    subscribe(app)
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut" })
  })

  it("reads an empty cache as SignedOut", async () => {
    const app = await load()
    subscribe(app)
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut" })
  })

  it("keeps a real login across a reload", async () => {
    stubFetch(json(200, OK_LOGIN))
    const first = await load()
    subscribe(first)
    await settle(first.signIn("rae@example.com", "pw"))

    const second = await load()
    subscribe(second)
    const session = second.getSessionSnapshot()
    expect(session.type).toBe("SignedIn")
    expect(session.type === "SignedIn" && session.token).toBe("jwt-1")
  })
})

describe("login", () => {
  it("rejects a 401 with the server's message and signs nobody out", async () => {
    const mock = stubFetch(json(401, { error: "Invalid email or password" }))
    const app = await load()
    const listener = vi.fn()
    subscribe(app, listener)
    listener.mockClear()

    const result = await settle(app.signIn("rae@example.com", "wrong"))

    expect(result.type).toBe("Rejected")
    if (result.type !== "Rejected") return
    expect(result.error).toBeInstanceOf(app.BadStatus)
    expect(app.fetchErrorToString(result.error)).toBe("Invalid email or password")
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut" })
    expect(sentHeaders(mock, 0)["Authorization"]).toBeUndefined()
    // No token was sent, so no sign-out ran: subscribers were never told anything changed.
    expect(listener).not.toHaveBeenCalled()
  })

  it("does not announce a 401 sent without a token", async () => {
    stubFetch(json(401, { error: "Invalid email or password" }))
    const app = await load()
    const announced = vi.fn()
    cleanups.push(app.onUnauthorized(announced))
    await settle(app.signIn("rae@example.com", "wrong"))
    expect(announced).not.toHaveBeenCalled()
  })

  it("sends Authorization: Bearer on requests after login, and not on the login itself", async () => {
    const mock = stubFetch(json(200, OK_LOGIN), json(200, {}))
    const app = await load()
    subscribe(app)

    const login = await settle(app.signIn("rae@example.com", "pw"))
    expect(login.type).toBe("Resolved")
    expect(app.getSessionSnapshot().type).toBe("SignedIn")
    await app.ping()

    expect(sentHeaders(mock, 0)["Authorization"]).toBeUndefined()
    expect(mock.mock.calls[0]?.[0]).toBe("/api/auth/login")
    expect(sentHeaders(mock, 1)["Authorization"]).toBe("Bearer jwt-1")
    expect(mock.mock.calls[0]?.[1]).not.toHaveProperty("credentials")
  })

  it("sends the bearer token and file name on an upload", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = stubFetch(json(200, {}))
    const app = await load()
    subscribe(app)
    const file = new File(["pdf"], "rn licence.pdf", { type: "application/pdf" })

    await settle(app.upload(app.authenticated, file))

    expect(sentHeaders(mock, 0)["Authorization"]).toBe("Bearer jwt-1")
    expect(sentHeaders(mock, 0)["X-File-Name"]).toBe("rn%20licence.pdf")
    expect(sentHeaders(mock, 0)["Content-Type"]).toBe("application/pdf")
  })
})

describe("signing out", () => {
  it("signs out on a 401 to an authenticated request", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = stubFetch(json(401, { error: "Token expired" }), json(200, {}))
    const app = await load()
    subscribe(app)
    expect(app.getSessionSnapshot().type).toBe("SignedIn")

    const result = await app.ping()

    expect(sentHeaders(mock, 0)["Authorization"]).toBe("Bearer jwt-1")
    expect(result.type === "Rejected" && app.fetchErrorToString(result.error)).toBe("Token expired")
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut" })
    expect(window.localStorage.getItem("session")).toBeNull()

    await app.ping()
    expect(sentHeaders(mock, 1)["Authorization"]).toBeUndefined()
  })

  it("keeps a new session when a request from the old token gets a late 401", async () => {
    window.localStorage.setItem("session", STORED)
    let replyToOld: (reply: Response) => void = () => {}
    const old = new Promise<Response>((resolve) => {
      replyToOld = resolve
    })
    const user = { id: "nurse-1", name: "Maria Lopez", role: "nurse" }
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockReturnValueOnce(old)
      .mockResolvedValueOnce(new Response(JSON.stringify({ token: "jwt-2", user }), { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)
    const app = await load()
    subscribe(app)

    const lateRequest = app.ping()
    await settle(app.signIn("maria@example.com", "secret"))
    replyToOld(new Response(JSON.stringify({ error: "Token expired" }), { status: 401 }))
    await lateRequest

    expect(app.getSessionSnapshot()).toMatchObject({ type: "SignedIn", token: "jwt-2" })
    expect(window.localStorage.getItem("session")).toContain("jwt-2")
  })

  it("keeps the session on a non-401 failure", async () => {
    window.localStorage.setItem("session", STORED)
    stubFetch(json(403, { error: "Forbidden" }))
    const app = await load()
    subscribe(app)
    await app.ping()
    expect(app.getSessionSnapshot().type).toBe("SignedIn")
  })

  it("signOut clears the cache and stops sending the token", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = stubFetch(json(200, {}))
    const app = await load()
    subscribe(app)

    app.signOut()
    await app.ping()

    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut" })
    expect(window.localStorage.getItem("session")).toBeNull()
    expect(sentHeaders(mock, 0)["Authorization"]).toBeUndefined()
  })
})

describe("several subscribers", () => {
  it("signs out and tells all of them on a 401", async () => {
    window.localStorage.setItem("session", STORED)
    stubFetch(json(401, { error: "Token expired" }))
    const app = await load()
    const a = vi.fn()
    const b = vi.fn()
    subscribe(app, a)
    subscribe(app, b)
    a.mockClear()
    b.mockClear()

    const result = await app.ping()

    expect(result.type).toBe("Rejected")
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut" })
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it("still signs out on a 401 after another subscriber has left", async () => {
    window.localStorage.setItem("session", STORED)
    stubFetch(json(401, { error: "Token expired" }))
    const app = await load()
    const leaving = app.subscribeToSession(() => {})
    subscribe(app)
    expect(app.getSessionSnapshot().type).toBe("SignedIn")

    leaving()
    await app.ping()

    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut" })
  })

  it("leaves nothing listening after the last subscriber goes", async () => {
    window.localStorage.setItem("session", STORED)
    stubFetch(json(401, { error: "Token expired" }))
    const app = await load()
    const off = app.subscribeToSession(() => {})
    off()

    await app.ping()

    expect(app.getSessionSnapshot().type).toBe("SignedIn")
  })
})

describe("other tabs", () => {
  const storageEvent = (key: string | null, newValue: string | null): StorageEvent =>
    new StorageEvent("storage", { key, newValue, storageArea: window.localStorage })

  it("takes a sign-in and a sign-out from another tab", async () => {
    const mock = stubFetch(json(200, {}))
    const app = await load()
    const listener = vi.fn()
    subscribe(app, listener)
    expect(app.getSessionSnapshot().type).toBe("SignedOut")
    listener.mockClear()

    window.dispatchEvent(storageEvent("session", STORED))
    expect(app.getSessionSnapshot().type).toBe("SignedIn")
    expect(listener).toHaveBeenCalled()
    await app.ping()
    expect(sentHeaders(mock, 0)["Authorization"]).toBe("Bearer jwt-1")

    window.dispatchEvent(storageEvent("session", null))
    expect(app.getSessionSnapshot().type).toBe("SignedOut")
  })

  it("reads a cleared store as a sign-out and ignores other keys", async () => {
    window.localStorage.setItem("session", STORED)
    const app = await load()
    subscribe(app)

    window.dispatchEvent(storageEvent("theme", "dark"))
    expect(app.getSessionSnapshot().type).toBe("SignedIn")

    window.dispatchEvent(storageEvent(null, null))
    expect(app.getSessionSnapshot().type).toBe("SignedOut")
  })
})

describe("useSession", () => {
  it("resolves the cache through the hook and unsubscribes on unmount", async () => {
    window.localStorage.setItem("session", STORED)
    const app = await load()
    const { useSession } = await import("@hooks/use-session")
    const { renderHook } = await import("@testing-library/react")

    const { result, unmount } = renderHook(() => useSession())
    expect(result.current.type).toBe("SignedIn")

    unmount()
    window.dispatchEvent(
      new StorageEvent("storage", { key: "session", newValue: null, storageArea: window.localStorage })
    )
    expect(app.getSessionSnapshot().type).toBe("SignedIn")
  })
})
