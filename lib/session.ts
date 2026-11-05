/**
 * Who is signed in, as the UI sees it, and the actions that change it: login and sign-out.
 *
 * The server's HttpOnly `sid` cookie is the only authority; this tab never holds a token. The user is cached in
 * `localStorage` so a returning visitor sees their screen at once, and `GET /api/auth/me` revalidates it on the first
 * subscribe and after any 401. The server render and first client frame are `Checking`. Sign-in and sign-out reach
 * other tabs through the `storage` event. A cached user the server no longer knows ends as `SignedOut { expired: true }`,
 * so the login form can say why (design canvas A4); every other way to `SignedOut` has `expired: false`.
 */
export { getSessionSnapshot, getServerSessionSnapshot, subscribeToSession, signIn, signOut, type Session }

import * as s from "@lib/json/schema"

import { api, schema_user, type User } from "@api/endpoints"
import { call, onUnauthorized, type FetchError } from "@api/request"
import { Future } from "@lib/future"
import { Just, Nothing, fromNullable, type Maybe } from "@lib/maybe"
import type { Actor } from "@lib/actor"

type Session = { type: "Checking" } | { type: "SignedOut"; expired: boolean } | { type: "SignedIn"; user: User }

const SESSION_KEY = "session"
const schema_stored = s.stringified(schema_user)
const CHECKING: Session = { type: "Checking" }
const SIGNED_OUT: Session = { type: "SignedOut", expired: false }

let current: Session = CHECKING
const listeners = new Set<() => void>()

/**
 * Counts identity changes: a sign-in or sign-out here or in another tab. A `/me` answer that started under an older
 * generation describes a session that no longer exists, so it is dropped instead of written over the newer one.
 */
let generation = 0
/** The generation a `/me` request is in flight for, so a burst of 401s (three parallel polls) asks once. */
let checkingAt: number | null = null

/** Show `next` to this tab only. */
function show(next: Session): void {
  current = next
  listeners.forEach((listener) => listener())
}

/** Cache and show the server's answer. */
function setSession(next: Session): void {
  writeStored(next)
  show(next)
}

/** Record a sign-in or sign-out. It supersedes any `/me` still in flight. */
function commitSession(next: Session): void {
  generation += 1
  setSession(next)
}

/** A corrupt, outdated (the old `{ token, user }` entry) or unknown-role entry reads as nothing cached. */
function decodeStored(raw: Maybe<string>): Maybe<User> {
  return raw.chain((text) =>
    s.decode(schema_stored, text).either<Maybe<User>>(
      () => Nothing(),
      (user) => Just(user)
    )
  )
}

const signedIn = (user: User): Session => ({ type: "SignedIn", user })

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
    if (session.type === "SignedIn")
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(s.encode(schema_user, session.user)))
    else window.localStorage.removeItem(SESSION_KEY)
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
 * `useSyncExternalStore`'s subscribe. The first subscriber shows the cache at once (after hydration, and after any gap
 * with no subscribers, when `storage` events were missed) and asks `/me` to confirm it. With nothing cached the visit
 * stays `Checking` until `/me` answers: the cookie may outlive a cleared `localStorage`.
 */
function subscribeToSession(listener: () => void): () => void {
  const isFirst = listeners.size === 0
  const onStorage = (event: StorageEvent): void => {
    if (event.storageArea !== window.localStorage) return
    if (event.key !== null && event.key !== SESSION_KEY) return
    // The other tab signed in or out and wrote the entry, so a `/me` in flight here is stale.
    generation += 1
    show(decodeStored(fromNullable(event.newValue)).maybe(SIGNED_OUT, signedIn))
  }
  // A closure per subscriber: the listeners are a Set, so a shared handler would be removed when any one unsubscribes.
  // Only a signed-in tab asks: a 401 while signed out is a failed login (FR-1.2).
  const offUnauthorized = onUnauthorized(() => {
    if (current.type === "SignedIn") revalidate()
  })
  listeners.add(listener)
  window.addEventListener("storage", onStorage)
  if (isFirst || current.type === "Checking") {
    const stored = readStored()
    if (stored.type === "Read")
      show(decodeStored(stored.raw).maybe(current.type === "Checking" ? CHECKING : SIGNED_OUT, signedIn))
    revalidate()
  }
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
    offUnauthorized()
  }
}

/**
 * Ask the server who we are and cache the answer. An unreachable server keeps a cached user (polls show stale data);
 * a visit still `Checking` falls to the login form. An answer from an older generation is dropped.
 */
function revalidate(): void {
  if (checkingAt === generation) return
  const startedAt = generation
  checkingAt = startedAt
  const settle = (): boolean => {
    if (checkingAt === startedAt) checkingAt = null
    return startedAt === generation
  }
  call(api.whoAmI, {}).fork(
    () => {
      if (settle() && current.type === "Checking") show(SIGNED_OUT)
    },
    ({ actor }) => {
      if (!settle()) return
      const next = fromActor(actor)
      if (!sameSession(current, next)) setSession(next)
    }
  )
}

function fromActor(actor: Actor): Session {
  switch (actor.type) {
    case "User":
      return signedIn({ id: actor.id, name: actor.name, role: actor.role })
    case "Anonymous":
      // Signed in a moment ago and the server no longer knows us: the session expired or was ended elsewhere.
      return { type: "SignedOut", expired: current.type === "SignedIn" }
    default:
      return actor satisfies never
  }
}

/** Equal sessions re-render nothing, so a confirming `/me` doesn't restart the screen's polls. */
function sameSession(a: Session, b: Session): boolean {
  if (a.type === "SignedIn" && b.type === "SignedIn")
    return a.user.id.value === b.user.id.value && a.user.name === b.user.name && a.user.role === b.user.role
  if (a.type === "SignedOut" && b.type === "SignedOut") return a.expired === b.expired
  return a.type === b.type
}

/**
 * Failures reject with the server's message for the banner (FR-1.7). The reply's `token` is for API clients (FR-1.1);
 * this tab rides the cookie the same reply set, so no second `/me` is needed.
 */
function signIn(email: string, password: string): Future<FetchError, User> {
  return call(api.login, { email, password }).map(({ user }) => {
    commitSession(signedIn(user))
    return user
  })
}

/**
 * Optimistic: the form shows at once and the server session ends in the background. If that request fails, `/me`
 * says whether the session survived, and a surviving one comes back instead of hiding behind the form.
 */
function signOut(): void {
  commitSession(SIGNED_OUT)
  const signedOutAt = generation
  call(api.logout, {}).fork(
    () => {
      if (generation === signedOutAt) revalidate()
    },
    () => {}
  )
}
