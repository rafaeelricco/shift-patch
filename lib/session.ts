/**
 * Who is signed in, as the UI sees it, and the actions that change it: login and sign-out.
 *
 * The token and user are cached in `localStorage`. The server render and first client frame are `Checking`, and the
 * cache is read after hydration, so returning visitors can't cause a mismatch. Sign-in and sign-out reach other tabs
 * through the `storage` event. A 401 on an authenticated request signs this tab out.
 */
export { getSessionSnapshot, getServerSessionSnapshot, subscribeToSession, signIn, signOut, type Session }

import * as s from "@lib/json/schema"

import { api, schema_user, type User } from "@api/endpoints"
import { call, onUnauthorized, setAuthToken, type FetchError } from "@api/request"
import { Future } from "@lib/future"
import { Just, Nothing, fromNullable, type Maybe } from "@lib/maybe"

type Session = { type: "Checking" } | { type: "SignedOut" } | { type: "SignedIn"; token: string; user: User }

const SESSION_KEY = "session"
const schema_entry = s.object({ token: s.string, user: schema_user })
const schema_stored = s.stringified(schema_entry)
const CHECKING: Session = { type: "Checking" }

let current: Session = CHECKING
const listeners = new Set<() => void>()

function commit(next: Session): void {
  current = next
  setAuthToken(next.type === "SignedIn" ? Just(next.token) : Nothing())
  listeners.forEach((listener) => listener())
}

function fromRaw(raw: Maybe<string>): Session {
  return raw.chain(decodeStored).maybe<Session>({ type: "SignedOut" }, ({ token, user }) => ({
    type: "SignedIn",
    token,
    user,
  }))
}

/** A corrupt or outdated entry reads as signed out. */
function decodeStored(raw: string): Maybe<s.Infer<typeof schema_stored>> {
  return s.decode(schema_stored, raw).either<Maybe<s.Infer<typeof schema_stored>>>(
    () => Nothing(),
    (value) => Just(value)
  )
}

type Stored = { type: "Unavailable" } | { type: "Read"; raw: Maybe<string> }

function readStored(): Stored {
  try {
    return { type: "Read", raw: fromNullable(window.localStorage.getItem(SESSION_KEY)) }
  } catch {
    return { type: "Unavailable" }
  }
}

/** A storage failure is ignored: the session still holds for this visit. */
function writeStored(session: Session): void {
  try {
    if (session.type === "SignedIn") {
      const { token, user } = session
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(s.encode(schema_entry, { token, user })))
    } else window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignored on purpose; see above.
  }
}

function getSessionSnapshot(): Session {
  return current
}

function getServerSessionSnapshot(): Session {
  return CHECKING
}

/**
 * `useSyncExternalStore`'s subscribe. The first subscriber re-reads the cache, after hydration and after any gap with
 * no subscribers, when `storage` events were missed. If storage is unavailable, a held session stays in memory.
 */
function subscribeToSession(listener: () => void): () => void {
  const isFirst = listeners.size === 0
  const onStorage = (event: StorageEvent): void => {
    if (event.storageArea !== window.localStorage) return
    if (event.key !== null && event.key !== SESSION_KEY) return
    commit(fromRaw(fromNullable(event.newValue)))
  }
  // A closure per subscriber: the listeners are a Set, so a shared `signOut` would be removed when any one unsubscribes.
  const offUnauthorized = onUnauthorized(() => signOut())
  listeners.add(listener)
  window.addEventListener("storage", onStorage)
  if (isFirst || current.type === "Checking") {
    const stored = readStored()
    if (stored.type === "Read") commit(fromRaw(stored.raw))
    else if (current.type === "Checking") commit({ type: "SignedOut" })
  }
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
    offUnauthorized()
  }
}

/** Failures reject with the server's message for the banner (FR-1.7). */
function signIn(email: string, password: string): Future<FetchError, User> {
  return call(api.login, { email, password }).map(({ token, user }) => {
    const next: Session = { type: "SignedIn", token, user }
    writeStored(next)
    commit(next)
    return user
  })
}

/** A JWT has no server session to end, so this only clears the client. */
function signOut(): void {
  const next: Session = { type: "SignedOut" }
  writeStored(next)
  commit(next)
}
