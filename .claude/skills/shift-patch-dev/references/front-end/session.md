# Session and auth

The web app models the signed-in user as one three-state union, **`Session = Checking | SignedOut | SignedIn`**, held in a module-level store in `lib/session.ts` and read through **`useSession`**. The browser's authorization is the HttpOnly **`sid` cookie** behind a server session in `auth_sessions`; the tab never holds a token. The cached user is UI state and grants nothing: identity, role and agency come only from the verified session on the server (SPEC FR-1.6). API clients may still send the login reply's JWT as `Authorization: Bearer`.

There is one way to sign in: **`signIn(email, password)`** calls `POST /api/auth/login`, which sets the cookie, and commits the reply's user. **`signOut()`** clears the client at once and ends the server session with `POST /api/auth/logout`. `GET /api/auth/me` revalidates a cached user on the first subscribe and after any 401. There are no redirects: `/` shows the login form directly when signed out (FR-1.8), and the role's landing screen once signed in.

Code: `lib/session.ts`, `hooks/use-session.ts`, `api/request.ts` (401 announcements), `api/endpoints.ts` (`api.login`, `api.whoAmI`, `api.logout`, `schema_user`), `lib/auth.ts` (server sessions and `authorize`). Form mechanics on the login form: `./forms.md`. Gate on the page: `./pages.md`.

## Audit

- Read `lib/session.ts`. Confirm that it owns the `"session"` `localStorage` key and the listener `Set`, and that every change goes through `setSession` or `commitSession`.
- Confirm `generation` and `checkingAt` gate every `/me` answer: a sign-in or sign-out (here or in another tab) bumps `generation`, and an answer from an older generation is dropped.
- The cached shape is `schema_user` from `@api/endpoints`, the same schema the login reply's `user` decodes with. No token is ever stored.
- `lib/actor.ts` describes who makes a request on the server. The session reads it only as the `/me` reply.
- Before adding one, search for a second identity source: a React Context, a `useState<Session>`, or a `localStorage` read of `"session"` outside `lib/session.ts`.
- Server calls go through `api` in `api/endpoints.ts`: `login` plus the shift, credential and timesheet entries.

Report the audit briefly:

```md
Session Audit:

- Session model (Checking / SignedOut / SignedIn):
- Session API (signIn / signOut):
- Persistence (localStorage "session", user only; `sid` cookie):
- Subscription (listener Set, storage event, onUnauthorized, /me revalidation):
- Gate (useSession at the page, role switch):
- Second identity sources found:
```

## Canonical references (by role)

- **`@lib/session`**: `signIn`, `signOut`, `subscribeToSession`, `getSessionSnapshot`, `getServerSessionSnapshot`; type `Session`.
- **`@hooks/use-session`**: `useSession`, the one way a component reads the session.
- **`@api/endpoints`**: `api` (`login`, `whoAmI`, `logout`), `schema_user`, type `User`.
- **`@api/request`**: `call`, `onUnauthorized`, `FetchError`, `fetchErrorToString`.
- **`@lib/maybe`**, **`@lib/future`**: `Maybe` for the cache, `Future` and `Cancel` for every call.

## Imports

```ts
import { useSession } from "@hooks/use-session"
import { signIn, signOut, type Session } from "@lib/session"
import { fetchErrorToString, type FetchError } from "@api/request"
```

## 1. The session model

```ts
type Session = { type: "Checking" } | { type: "SignedOut"; expired: boolean } | { type: "SignedIn"; user: User }
```

- **`Checking`**: the server render and the first client frame. `localStorage` can't be read yet, so the first client render matches the server's HTML. A returning visitor can't cause a hydration mismatch. With nothing cached, the visit stays `Checking` until `/me` answers.
- **`SignedOut`**: no session. Show the login form. `expired: true` only when a cached user's session is gone on the server (`/me` answered `Anonymous`), so the form says "Session expired, sign in again"; every other way here has `expired: false`.
- **`SignedIn`**: a cached or fresh user. `user` is `{ id, name, role }`, with `role` one of `nurse`, `agency`, `admin`. An agency's `id` is its agency ID and its `name` is the agency name (FR-1.3).

Match on `session.type` exhaustively, ending in `satisfies never`. A failed login isn't a session state: it is a `RemoteData` cell on the form, and the session stays `SignedOut`.

## 2. The session API

- **`signIn(email, password)`** returns a lazy `Future<FetchError, User>`. Nothing is sent until it is forked. Success caches the user and commits `SignedIn` (the reply's `token` is for API clients and is ignored), so the gate swaps the screen with no success handler. Failure rejects and changes nothing. A 401 carries `Invalid email or password` (FR-1.2), which `fetchErrorToString` turns into the banner's text (FR-1.7).
- **`signOut()`** is optimistic: it removes the cache and commits `SignedOut` at once, then `POST /api/auth/logout` deletes the server session. If that request fails, `/me` says whether the session survived, and a surviving one comes back.
- **`useSession()`** wraps `useSyncExternalStore(subscribeToSession, getSessionSnapshot, getServerSessionSnapshot)`. Its file carries `"use client"`.

## 3. Persistence and subscription

- `localStorage["session"]` holds `JSON.stringify(s.encode(schema_user, user))`. `user.id` is an `Id`, so `JSON.stringify` alone would not round-trip it. Reads decode with `s.stringified(schema_user)`, and a corrupt or outdated entry (including the old `{ token, user }` shape) reads as nothing cached. Storage exceptions are swallowed: the session still holds for this visit.
- The first subscriber shows the cache and asks `GET /api/auth/me` to confirm it. `useSyncExternalStore` subscribes after hydration, which is why reading there is safe. A confirming answer re-renders nothing. An unreachable server keeps a cached user; with nothing cached the form shows.
- Changes in the same tab reach every listener in the module-level `Set`. Changes from other tabs arrive through the browser `storage` event (key `"session"`, or `null` for `localStorage.clear()`); they bump `generation` and are trusted without asking `/me`.
- Each subscriber registers `onUnauthorized` and `storage`. Several subscribers are safe, since both handlers reach the same outcome.

## 4. Cookies and 401s

- `call` and `upload` send same-origin requests, so the browser attaches the `sid` cookie. No caller adds a header or a `credentials` option.
- Every 401 fires the `onUnauthorized` listeners. A signed-in tab asks `/me` (once per burst); `Anonymous` signs it out with `expired: true`, and a `User` answer (a late 401 from an older session) keeps it.
- A 401 while signed out is a failed login. The session ignores it.
- A 403 is a role or credential answer (FR-1.5, FR-4.1), not a lost session. It stays an ordinary `BadStatus` for the banner.

## 5. Server contract

- `POST /api/auth/login` with `{ email, password }` returns 200 and `{ token, user: { id, name, role } }`. A wrong email or wrong password returns 401 and `{ "error": "Invalid email or password" }`, with no difference between the two (FR-1.1, FR-1.2).
- Login also sets `sid=<opaque 256-bit token>; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800` (plus `Secure` over https). The server stores only its SHA-256 in `auth_sessions`, with a fixed 8h lifetime that never slides.
- `GET /api/auth/me` is public and returns `{ actor }`: the user, or `{ type: "Anonymous" }` for a missing, expired or ended session. Never 401.
- `POST /api/auth/logout` deletes the request's session and returns 200 `{}`. It is public and idempotent, and sends no clearing cookie (a slow reply could otherwise clear a newer sign-in's cookie).
- An `Authorization` header, when present, is judged alone and never falls back to the cookie. A missing, malformed or expired credential on an authenticated route returns 401 with `{ error }`. A role that isn't allowed returns 403 with `{ error }` (FR-1.4, FR-1.5).
- After 20 failed logins for one email and client address within 15 minutes, further attempts return 429 with `{ error }` (NFR-2). The form shows it in the banner like any failure.
- Every error body is `{ "error": "<message>" }`, which becomes `BadStatus.message`.
- Sample accounts are in the "Sample data" section of `docs/ShiftPatch-Technical-Spec.md`.

## Do / Do not

- Do: read the session with `useSession`, and pass what a child needs as props.
- Do: route every change through `setSession` or `commitSession`. `signIn` and `signOut` are the public doors.
- Do: treat `Checking` as its own state. Render a loading surface, not the login form.
- Do: show login failures in `NotificationBanner` with `notification-banner` (FR-1.7).
- Do not: read `localStorage` during render, or in the initial state of `useState`. That is a hydration mismatch.
- Do not: merge `Checking` into `SignedOut`, or a returning visitor sees the login form flash.
- Do not: add a React Context or a second store for identity.
- Do not: store or send a token from the browser. The cookie is the session.
- Do not: treat the cached user as authorization. The server decides. Hiding a screen is only a convenience (FR-5.5).
- Do not: add redirects or a return path. There is one route and it shows the right thing.
