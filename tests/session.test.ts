import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { type Future } from "@lib/future"

const ME = "/api/auth/me"
const LOGIN = "/api/auth/login"
const LOGOUT = "/api/auth/logout"
const PING = "/api/shifts/list"

const USER = { id: "user-1", name: "Rae Nurse", role: "nurse" }
const MARIA = { id: "nurse-1", name: "Maria Lopez", role: "nurse" }
const STORED = JSON.stringify(USER) // the cache is the user alone; the cookie is the session
const ANONYMOUS = { type: "Anonymous" }
const asActor = (user: typeof USER) => ({ type: "User", ...user })

const json = (status: number, body: unknown): Response => new Response(JSON.stringify(body), { status })
const me = (actor: unknown): Response => json(200, { actor })

type Route = Response | ((init: RequestInit | undefined) => Response | Promise<Response>)

/** Answers by path; an unrouted path fails like an unreachable server. Every call is recorded. */
function serve(routes: Record<string, Route>) {
  const mock = vi.fn<typeof fetch>(async (input, init) => {
    const route = routes[String(input)]
    if (route === undefined) throw new TypeError(`unreachable: ${String(input)}`)
    return typeof route === "function" ? route(init) : route.clone()
  })
  vi.stubGlobal("fetch", mock)
  return mock
}

const calls = (mock: ReturnType<typeof serve>, path: string) => mock.mock.calls.filter(([p]) => p === path)

function sentHeaders(mock: ReturnType<typeof serve>, path: string): Record<string, string> {
  const init = calls(mock, path)[0]?.[1]
  return (init?.headers ?? {}) as Record<string, string>
}

/** A reply the test releases by hand, to hold a request in flight. */
function deferred() {
  let release: (reply: Response) => void = () => {}
  const reply = new Promise<Response>((resolve) => {
    release = resolve
  })
  return { reply, release }
}

/** Lets pending fetch replies and their Future chains run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

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
  const authenticated = new PlainEndpoint({ path: PING, request: s.object({}), response: s.object({}) })
  return { ...session, ...request, authenticated, ping: () => settle(request.call(authenticated, {})) }
}

type App = Awaited<ReturnType<typeof load>>

const cleanups: Array<() => void> = []

function subscribe(app: App, listener: () => void = () => {}) {
  const off = app.subscribeToSession(listener)
  cleanups.push(off)
  return off
}

const signedInAs = (app: App) => {
  const session = app.getSessionSnapshot()
  return session.type === "SignedIn" ? session.user.id.value : null
}

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanups.splice(0).forEach((off) => off())
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe("resolving the session", () => {
  it("is Checking on the server and before anyone subscribes", async () => {
    window.localStorage.setItem("session", STORED)
    const app = await load()
    expect(app.getServerSessionSnapshot()).toEqual({ type: "Checking" })
    expect(app.getSessionSnapshot()).toEqual({ type: "Checking" })
  })

  it("shows a cached user at once and confirms it with /api/auth/me once, re-rendering nothing", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = serve({ [ME]: me(asActor(USER)) })
    const app = await load()
    const listener = vi.fn()
    subscribe(app, listener)
    expect(signedInAs(app)).toBe("user-1")
    listener.mockClear()

    await flush()

    expect(calls(mock, ME)).toHaveLength(1)
    expect(listener).not.toHaveBeenCalled()
    expect(signedInAs(app)).toBe("user-1")
  })

  it("stays Checking with nothing cached until /api/auth/me answers, then caches the user", async () => {
    serve({ [ME]: me(asActor(USER)) })
    const app = await load()
    subscribe(app)
    expect(app.getSessionSnapshot()).toEqual({ type: "Checking" })

    await vi.waitFor(() => expect(signedInAs(app)).toBe("user-1"))
    expect(window.localStorage.getItem("session")).toContain("user-1")
  })

  it("reads Anonymous with nothing cached as SignedOut, not expired", async () => {
    serve({ [ME]: me(ANONYMOUS) })
    const app = await load()
    subscribe(app)
    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false }))
  })

  it.each([
    ["invalid JSON", "{not json"],
    ["an unknown role", JSON.stringify({ ...USER, role: "owner" })],
    ["the old token entry", JSON.stringify({ token: "jwt-1", user: USER })],
  ])("reads %s as nothing cached", async (_, entry) => {
    window.localStorage.setItem("session", entry)
    serve({ [ME]: me(ANONYMOUS) })
    const app = await load()
    subscribe(app)
    expect(app.getSessionSnapshot()).toEqual({ type: "Checking" })
    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false }))
  })

  it("signs out with expired: true when the server no longer knows the cached user", async () => {
    window.localStorage.setItem("session", STORED)
    serve({ [ME]: me(ANONYMOUS) })
    const app = await load()
    subscribe(app)
    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: true }))
    expect(window.localStorage.getItem("session")).toBeNull()
  })

  it("keeps a cached user when /api/auth/me can't be reached", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = serve({})
    const app = await load()
    subscribe(app)
    await flush()
    expect(calls(mock, ME)).toHaveLength(1)
    expect(signedInAs(app)).toBe("user-1")
  })

  it("falls to the form when /api/auth/me can't be reached and nothing is cached", async () => {
    serve({})
    const app = await load()
    subscribe(app)
    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false }))
  })
})

describe("login", () => {
  it("rejects a 401 with the server's message and asks the server nothing more", async () => {
    const mock = serve({ [ME]: me(ANONYMOUS), [LOGIN]: json(401, { error: "Invalid email or password" }) })
    const app = await load()
    const listener = vi.fn()
    subscribe(app, listener)
    await vi.waitFor(() => expect(app.getSessionSnapshot().type).toBe("SignedOut"))
    listener.mockClear()

    const result = await settle(app.signIn("rae@example.com", "wrong"))
    await flush()

    expect(result.type).toBe("Rejected")
    if (result.type !== "Rejected") return
    expect(result.error).toBeInstanceOf(app.BadStatus)
    expect(app.fetchErrorToString(result.error)).toBe("Invalid email or password")
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false })
    expect(listener).not.toHaveBeenCalled()
    expect(calls(mock, ME)).toHaveLength(1)
  })

  it("commits the user, caches no token, and sends no Authorization afterwards", async () => {
    const mock = serve({
      [ME]: me(ANONYMOUS),
      [LOGIN]: json(200, { token: "jwt-1", user: USER }),
      [PING]: json(200, {}),
    })
    const app = await load()
    subscribe(app)
    await vi.waitFor(() => expect(app.getSessionSnapshot().type).toBe("SignedOut"))

    const login = await settle(app.signIn("rae@example.com", "pw"))
    await app.ping()

    expect(login.type).toBe("Resolved")
    expect(signedInAs(app)).toBe("user-1")
    expect(window.localStorage.getItem("session")).toContain("user-1")
    expect(window.localStorage.getItem("session")).not.toContain("jwt-1")
    expect(sentHeaders(mock, PING)["Authorization"]).toBeUndefined()
    expect(calls(mock, PING)[0]?.[1]).not.toHaveProperty("credentials")
  })

  it("sends the file name and type on an upload, with no Authorization", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = serve({ [ME]: me(asActor(USER)), [PING]: json(200, {}) })
    const app = await load()
    subscribe(app)
    const file = new File(["pdf"], "rn licence.pdf", { type: "application/pdf" })

    await settle(app.upload(app.authenticated, file))

    expect(sentHeaders(mock, PING)["Authorization"]).toBeUndefined()
    expect(sentHeaders(mock, PING)["X-File-Name"]).toBe("rn%20licence.pdf")
    expect(sentHeaders(mock, PING)["Content-Type"]).toBe("application/pdf")
  })
})

describe("losing the session", () => {
  it("asks /api/auth/me after a 401 and signs out with expired: true", async () => {
    window.localStorage.setItem("session", STORED)
    let server: unknown = asActor(USER)
    const mock = serve({ [ME]: () => me(server), [PING]: json(401, { error: "Session expired, sign in again" }) })
    const app = await load()
    subscribe(app)
    await flush()
    server = ANONYMOUS

    const result = await app.ping()

    expect(result.type === "Rejected" && app.fetchErrorToString(result.error)).toBe("Session expired, sign in again")
    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: true }))
    expect(window.localStorage.getItem("session")).toBeNull()
    expect(calls(mock, ME)).toHaveLength(2)
  })

  it("asks /api/auth/me once for a burst of 401s", async () => {
    window.localStorage.setItem("session", STORED)
    const check = deferred()
    let answers = 0
    const mock = serve({
      [ME]: () => (++answers === 1 ? me(asActor(USER)) : check.reply),
      [PING]: json(401, { error: "Session expired, sign in again" }),
    })
    const app = await load()
    subscribe(app)
    await flush()

    await Promise.all([app.ping(), app.ping(), app.ping()])
    check.release(me(ANONYMOUS))

    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: true }))
    expect(calls(mock, ME)).toHaveLength(2)
  })

  it("keeps a new session when a request from the old one gets a late 401", async () => {
    window.localStorage.setItem("session", STORED)
    const late = deferred()
    let server: unknown = asActor(USER)
    serve({ [ME]: () => me(server), [PING]: () => late.reply, [LOGIN]: json(200, { token: "jwt-2", user: MARIA }) })
    const app = await load()
    subscribe(app)
    await flush()

    const lateRequest = app.ping()
    await settle(app.signIn("maria@example.com", "secret"))
    server = asActor(MARIA)
    late.release(json(401, { error: "Session expired, sign in again" }))
    await lateRequest
    await flush()

    expect(signedInAs(app)).toBe("nurse-1")
    expect(window.localStorage.getItem("session")).toContain("nurse-1")
  })

  it("drops a /api/auth/me answer that started before a sign-in", async () => {
    const check = deferred()
    serve({ [ME]: () => check.reply, [LOGIN]: json(200, { token: "jwt-1", user: USER }) })
    const app = await load()
    subscribe(app)
    expect(app.getSessionSnapshot().type).toBe("Checking")

    await settle(app.signIn("rae@example.com", "pw"))
    check.release(me(ANONYMOUS))
    await flush()

    expect(signedInAs(app)).toBe("user-1")
  })

  it("keeps the session on a 403 and asks nothing", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = serve({ [ME]: me(asActor(USER)), [PING]: json(403, { error: "Forbidden" }) })
    const app = await load()
    subscribe(app)
    await app.ping()
    await flush()
    expect(signedInAs(app)).toBe("user-1")
    expect(calls(mock, ME)).toHaveLength(1)
  })
})

describe("signing out", () => {
  it("shows the form at once, clears the cache and ends the server session", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = serve({ [ME]: me(asActor(USER)), [LOGOUT]: json(200, {}) })
    const app = await load()
    subscribe(app)
    await flush()

    app.signOut()

    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false })
    expect(window.localStorage.getItem("session")).toBeNull()
    await vi.waitFor(() => expect(calls(mock, LOGOUT)).toHaveLength(1))
    expect(calls(mock, LOGOUT)[0]?.[1]?.method).toBe("POST")
    await flush()
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false })
    expect(calls(mock, ME)).toHaveLength(1)
  })

  it("brings a surviving session back when the logout request fails", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = serve({ [ME]: me(asActor(USER)), [LOGOUT]: json(500, { error: "Something went wrong, try again" }) })
    const app = await load()
    subscribe(app)
    await flush()

    app.signOut()
    expect(app.getSessionSnapshot().type).toBe("SignedOut")

    await vi.waitFor(() => expect(signedInAs(app)).toBe("user-1"))
    expect(calls(mock, ME)).toHaveLength(2)
  })
})

describe("several subscribers", () => {
  const losing = () => {
    let answers = 0
    return serve({
      [ME]: () => me(++answers === 1 ? asActor(USER) : ANONYMOUS),
      [PING]: json(401, { error: "Session expired, sign in again" }),
    })
  }

  it("tells all of them when a 401 ends the session", async () => {
    window.localStorage.setItem("session", STORED)
    losing()
    const app = await load()
    const a = vi.fn()
    const b = vi.fn()
    subscribe(app, a)
    subscribe(app, b)
    await flush()
    a.mockClear()
    b.mockClear()

    await app.ping()

    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: true }))
    expect(a).toHaveBeenCalled()
    expect(b).toHaveBeenCalled()
  })

  it("still checks after a 401 when another subscriber has left", async () => {
    window.localStorage.setItem("session", STORED)
    losing()
    const app = await load()
    const leaving = app.subscribeToSession(() => {})
    subscribe(app)
    await flush()

    leaving()
    await app.ping()

    await vi.waitFor(() => expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: true }))
  })

  it("leaves nothing listening after the last subscriber goes", async () => {
    window.localStorage.setItem("session", STORED)
    const mock = losing()
    const app = await load()
    app.subscribeToSession(() => {})()
    await flush()

    await app.ping()
    await flush()

    expect(signedInAs(app)).toBe("user-1")
    expect(calls(mock, ME)).toHaveLength(1)
  })
})

describe("resubscribing after everyone unsubscribed", () => {
  it("picks up a sign-out made while nothing was listening", async () => {
    window.localStorage.setItem("session", STORED)
    let server: unknown = asActor(USER)
    serve({ [ME]: () => me(server) })
    const app = await load()
    app.subscribeToSession(() => {})()
    await flush()
    window.localStorage.removeItem("session")
    server = ANONYMOUS

    subscribe(app)

    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false })
    await flush()
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false })
  })

  it("picks up another account made while nothing was listening", async () => {
    window.localStorage.setItem("session", STORED)
    let server: unknown = asActor(USER)
    serve({ [ME]: () => me(server) })
    const app = await load()
    app.subscribeToSession(() => {})()
    await flush()
    const other = { ...USER, id: "user-2" }
    window.localStorage.setItem("session", JSON.stringify(other))
    server = asActor(other)

    subscribe(app)

    expect(signedInAs(app)).toBe("user-2")
    await flush()
    expect(signedInAs(app)).toBe("user-2")
  })

  it("keeps an in-memory session when storage is unavailable", async () => {
    window.localStorage.setItem("session", STORED)
    let reachable = true
    serve({
      [ME]: () => {
        if (!reachable) throw new TypeError("offline")
        return me(asActor(USER))
      },
    })
    const app = await load()
    app.subscribeToSession(() => {})()
    await flush()
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied")
    })
    reachable = false

    subscribe(app)
    await flush()

    expect(signedInAs(app)).toBe("user-1")
  })
})

describe("other tabs", () => {
  const storageEvent = (key: string | null, newValue: string | null): StorageEvent =>
    new StorageEvent("storage", { key, newValue, storageArea: window.localStorage })

  it("takes a sign-in and a sign-out from another tab without asking the server", async () => {
    const mock = serve({ [ME]: me(ANONYMOUS) })
    const app = await load()
    const listener = vi.fn()
    subscribe(app, listener)
    await vi.waitFor(() => expect(app.getSessionSnapshot().type).toBe("SignedOut"))
    listener.mockClear()

    window.dispatchEvent(storageEvent("session", STORED))
    expect(signedInAs(app)).toBe("user-1")
    expect(listener).toHaveBeenCalled()

    window.dispatchEvent(storageEvent("session", null))
    expect(app.getSessionSnapshot()).toEqual({ type: "SignedOut", expired: false })
    expect(calls(mock, ME)).toHaveLength(1)
  })

  it("reads a cleared store as a sign-out and ignores other keys", async () => {
    window.localStorage.setItem("session", STORED)
    serve({ [ME]: me(asActor(USER)) })
    const app = await load()
    subscribe(app)
    await flush()

    window.dispatchEvent(storageEvent("theme", "dark"))
    expect(signedInAs(app)).toBe("user-1")

    window.dispatchEvent(storageEvent(null, null))
    expect(app.getSessionSnapshot().type).toBe("SignedOut")
  })

  it("drops a /api/auth/me in flight when another tab signs in", async () => {
    const check = deferred()
    serve({ [ME]: () => check.reply })
    const app = await load()
    subscribe(app)

    window.dispatchEvent(storageEvent("session", STORED))
    check.release(me(ANONYMOUS))
    await flush()

    expect(signedInAs(app)).toBe("user-1")
  })
})

describe("useSession", () => {
  it("resolves the cache through the hook and unsubscribes on unmount", async () => {
    window.localStorage.setItem("session", STORED)
    serve({ [ME]: me(asActor(USER)) })
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
