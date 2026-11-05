# Session and auth

The web app models the signed-in user as one three-state union, **`Session = Checking | SignedOut | SignedIn`**, held in a module-level store in `lib/session.ts` and read through **`useSession`**. A **JWT**, sent as `Authorization: Bearer <token>`, is the only authorization. The cached user is UI state and grants nothing: identity, role and agency come only from the verified token on the server (SPEC FR-1.6).

There is one way to sign in: **`signIn(email, password)`** calls `POST /api/auth/login` and commits the reply. **`signOut()`** clears the client, because a JWT has no server session to end. There are no redirects: `/` shows the login form directly when signed out (FR-1.8), and the role's landing screen once signed in.

`POST /api/auth/login` isn't built yet, so sign-in is proven only against a mocked `fetch` in `tests/session.test.ts`.

Code: `lib/session.ts`, `hooks/use-session.ts`, `api/request.ts` (the token and 401 handling), `api/endpoints.ts` (`api.login`, `schema_user`). Form mechanics on the login form: `./forms.md`. Gate on the page: `./pages.md`.

## Audit

- Read `lib/session.ts`. Confirm that it owns the `"session"` `localStorage` key and the listener `Set`, and that every change goes through `commit`.
- Confirm `setAuthToken` is called only from `commit`, so `call` and the session can't disagree about the token.
- The cached shape is `schema_entry`: `{ token, user }`, with `user` as `schema_user` from `@api/endpoints`, the same schema the login reply decodes with.
- `lib/actor.ts` describes who makes a request on the server. The session doesn't use it.
- Before adding one, search for a second identity source: a React Context, a `useState<Session>`, or a `localStorage` read of `"session"` outside `lib/session.ts`.
- Server calls go through `api` in `api/endpoints.ts`. Today that is `login` only.

Report the audit briefly:

```md
Session Audit:

- Session model (Checking / SignedOut / SignedIn):
- Session API (signIn / signOut):
- Persistence (localStorage "session", token and user):
- Subscription (listener Set, storage event, onUnauthorized):
- Gate (useSession at the page, role switch):
- Second identity sources found:
```

## Canonical references (by role)

- **`@lib/session`**: `signIn`, `signOut`, `subscribeToSession`, `getSessionSnapshot`, `getServerSessionSnapshot`; type `Session`.
- **`@hooks/use-session`**: `useSession`, the one way a component reads the session.
- **`@api/endpoints`**: `api`, `schema_user`, type `User`.
- **`@api/request`**: `call`, `onUnauthorized`, `setAuthToken`, `FetchError`, `fetchErrorToString`.
- **`@lib/maybe`**, **`@lib/future`**: `Maybe` for the token, `Future` and `Cancel` for every call.

## Imports

```ts
import { useSession } from "@hooks/use-session"
import { signIn, signOut, type Session } from "@lib/session"
import { fetchErrorToString, type FetchError } from "@api/request"
```

## 1. The session model

```ts
type Session = { type: "Checking" } | { type: "SignedOut" } | { type: "SignedIn"; token: string; user: User }
```

- **`Checking`**: the server render and the first client frame. `localStorage` can't be read yet, so the first client render matches the server's HTML. A returning visitor can't cause a hydration mismatch.
- **`SignedOut`**: nothing valid is cached. Show the login form.
- **`SignedIn`**: a cached or fresh token and user. `user` is `{ id, name, role }`, with `role` one of `nurse`, `agency`, `admin`. An agency's `id` is its agency ID and its `name` is the agency name (FR-1.3).

Match on `session.type` exhaustively, ending in `satisfies never`. A failed login isn't a session state: it is a `RemoteData` cell on the form, and the session stays `SignedOut`.

## 2. The session API

- **`signIn(email, password)`** returns a lazy `Future<FetchError, User>`. Nothing is sent until it is forked. Success writes the cache and commits `SignedIn`, so the gate swaps the screen with no success handler. Failure rejects and changes nothing. A 401 carries `Invalid email or password` (FR-1.2), which `fetchErrorToString` turns into the banner's text (FR-1.7).
- **`signOut()`** removes the cache and commits `SignedOut`. It sends no request.
- **`useSession()`** wraps `useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot)`. Its file carries `"use client"`.

## 3. Persistence and subscription

- `localStorage["session"]` holds `JSON.stringify(s.encode(schema_entry, { token, user }))`. `user.id` is an `Id`, so `JSON.stringify` alone would not round-trip it. Reads decode with `s.stringified(schema_entry)`, and a corrupt or outdated entry reads as `SignedOut`. Storage exceptions are swallowed: the session still holds for this visit.
- The first subscriber resolves `Checking` from the cache. `useSyncExternalStore` subscribes after hydration, which is why reading there is safe.
- Changes in the same tab reach every listener in the module-level `Set` through `commit`. Changes from other tabs arrive through the browser `storage` event (key `"session"`, or `null` for `localStorage.clear()`).
- Each subscriber registers `onUnauthorized` and `storage`. Several subscribers are safe, since both handlers reach the same outcome.

## 4. The token and 401s

- `commit` hands the token to `setAuthToken`, and `send` in `api/request.ts` reads it when the request starts. `call` and `upload` add the `Authorization` header by themselves. No caller passes it.
- A 401 on a request that carried a token means the server no longer accepts it. `onUnauthorized` listeners fire, and `lib/session.ts` signs this tab out, so the login form appears.
- A 401 with no token is a failed login. It announces nothing.
- A 403 is a role or credential answer (FR-1.5, FR-4.1), not a lost session. It stays an ordinary `BadStatus` for the banner.

## 5. Server contract

- `POST /api/auth/login` with `{ email, password }` returns 200 and `{ token, user: { id, name, role } }`. A wrong email or wrong password returns 401 and `{ "error": "Invalid email or password" }`, with no difference between the two (FR-1.1, FR-1.2).
- A missing, malformed or expired token on an authenticated route returns 401 with `{ error }`. A role that isn't allowed returns 403 with `{ error }` (FR-1.4, FR-1.5).
- After 20 failed logins for one email and client address within 15 minutes, further attempts return 429 with `{ error }` (NFR-2). The form shows it in the banner like any failure.
- Every error body is `{ "error": "<message>" }`, which becomes `BadStatus.message`.
- Sample accounts are in the "Sample data" section of `docs/ShiftPatch-Technical-Spec.md`.

## Do / Do not

- Do: read the session with `useSession`, and pass what a child needs as props.
- Do: route every change through `commit`. `signIn` and `signOut` are the public doors.
- Do: treat `Checking` as its own state. Render a loading surface, not the login form.
- Do: show login failures in `NotificationBanner` with `notification-banner` (FR-1.7).
- Do not: read `localStorage` during render, or in the initial state of `useState`. That is a hydration mismatch.
- Do not: merge `Checking` into `SignedOut`, or a returning visitor sees the login form flash.
- Do not: add a React Context or a second store for identity.
- Do not: treat the cached user as authorization. The server decides. Hiding a screen is only a convenience (FR-5.5).
- Do not: add redirects or a return path. There is one route and it shows the right thing.
