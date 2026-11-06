# Pages

Every data-driven screen follows one skeleton: a **`RemoteData`** cell that a **`Future.fork`** fills inside `useEffect`; the render branches **exhaustively** (`instanceof … satisfies never`); a **container/presentational split** keeps the screen component thin; and the data comes from a **composed `Future` layer** (`.map` to project a field, `Future.concurrently` for independent reads, `.chain` for a dependent step, and `Future.mapConcurrently` to fan out over a collection).

ShiftPatch has one route, `/`, and FR-1.8 gives each role one landing screen with no further navigation. So the page is a **session gate** and the screens are its children, all in one page file.

Table a screen renders: `./tables.md`. Write that mutates its data: `./forms.md`. Session: `./session.md`. Visual constraints: `./design-system.md`.

`app/page.tsx` contains the sign-in and nurse screens, plus the agency and admin shells. The examples below illustrate the pattern rather than reproducing those screens.

## Audit

- Read `app/layout.tsx` (the root layout, a server component) and `app/page.tsx`. Find the `RemoteData` and `Future` modules (`lib/remote-data.ts`, `lib/future.ts`).
- Check the role's list in SPEC FR-1.8 for the test IDs this screen must show.
- Read one nearby screen before editing, if there is one, and match its state-cell shape, exhaustive match, and container/presentational split.

Report the audit briefly:

```md
Page Audit:

- Client boundary ("use client"):
- Session gate and role:
- RemoteData / Future modules:
- Read endpoints (api.*):
- Data-layer composition (map / concurrently / chain / mapConcurrently):
- Loading, empty and error surfaces:
- Test IDs on this screen:
- Nearby screens referenced:
```

## Canonical references (by role)

- **`@hooks/use-session`**: `useSession`, the gate's input.
- **`@lib/remote-data`**: `RemoteData`, `NotAsked`, `Loading`, `Failed`, `Ready`.
- **`@lib/future`**: `Future`, `Future.concurrently`, `Future.mapConcurrently`, `.chain`, `.map`, `.fork`.
- **`@api/endpoints`**, **`@api/request`**: typed `api.*` and `call`, `FetchError`, `fetchErrorToString` (see `./forms.md`).
- **`@lib/json/schema`**: `s.Infer<typeof api.<name>.response>` derives a response type.
- **`@ui/state-message`**: `StateMessage`, the loading, empty and error surface.
- **`@ui/notification-banner`**: `NotificationBanner`, inline errors. Sonner shows success confirmations.
- **`@ui/page-shell`**: `PageShell` (title and icon). **`@ui/status-badge`**: `StatusBadge`. Shift rows are `ShiftLedger` and `ShiftRow` in `app/page.tsx`, their one importer.
- **`@ui/datatable`**: `DataTable` (see `./tables.md`).

## Imports

```ts
import { useEffect, useState } from "react"
import { Calendar03Icon } from "@hugeicons/core-free-icons"
import * as s from "@lib/json/schema"
import { type RemoteData, NotAsked, Loading, Failed, Ready } from "@lib/remote-data"
import { Future } from "@lib/future"
import { api } from "@api/endpoints"
import { call, fetchErrorToString, type FetchError } from "@api/request"
import { useSession } from "@hooks/use-session"
import { Button } from "@ui/button"
import { PageShell } from "@ui/page-shell"
import { StateMessage } from "@ui/state-message"
```

## 1. The `"use client"` boundary and the session gate

A page file that uses state, effects, event handlers or `useSession` starts with `"use client"`, then `export default <Page>`, then its imports. `app/layout.tsx` stays a server component and keeps `metadata`, which a client file can't export.

The session is `Checking` on the server render and the first client frame (`./session.md`), so the gate's first branch is a loading surface. The server's HTML is never a role's screen, and no fetch runs on the server. `user.role` picks the screen:

```tsx
function HomePage() {
  const session = useSession()
  switch (session.type) {
    case "Checking":
      return <StateMessage state={{ kind: "loading", label: "Loading" }} />
    case "SignedOut":
      return <LoginForm />
    case "SignedIn":
      return <RoleScreen user={session.user} />
    default:
      return session satisfies never
  }
}
```

Each role's screen sits inside the section shell (the `@container/section-shell` frame and its parts, written as utilities in `app/page.tsx`), whose sidebar rows jump between sections of that one screen. Sign-out is on every screen (FR-1.8).

## 2. The screen state cell (`RemoteData` + `Future.fork`)

Model a screen's read as one `RemoteData<FetchError, T>` cell, seeded `Loading()` because the read starts on mount. `.fork` inside `useEffect`. `fork` returns a cancel function: return it from the effect, so an in-flight read is cancelled on unmount or dependency change.

```ts
const [state, setState] = useState<RemoteData<FetchError, Shift[]>>(Loading())
useEffect(
  () =>
    fetchShifts().fork(
      (error) => setState(Failed(error)),
      (shifts) => setState(Ready(shifts))
    ),
  [attempt]
)
```

Don't call `setState(Loading())` in the effect body: `pnpm lint` rejects it (`react-hooks/set-state-in-effect`). A retry sets `Loading()` in its click handler and bumps `attempt`. A **status-only cell** (`RemoteData<E, never>`, no content on `Ready`, such as a save in flight) seeds `NotAsked()`.

**Polled data.** The admin dashboard shows a change within 5 seconds with no reload (FR-5.4), and WebSockets are out of scope. Poll with `window.setInterval` and `Duration.seconds(n).asMilliseconds()`, cancel the previous `Future` before each tick, and only write the cell on a reply, so the table stays on screen between polls. Lists and polled data never animate.

## 3. Exhaustive rendering (`instanceof … satisfies never`)

Branch every `RemoteData` case with `instanceof`, ending in `(state satisfies never)`, so adding a new variant becomes a compile error. SPEC NFR-7 requires loading, empty and error on every screen:

```tsx
{
  state instanceof Ready ? <Content shifts={state.value} />
  : state instanceof Loading || state instanceof NotAsked ?
    <StateMessage state={{ kind: "loading", label: "Loading shifts" }} />
  : state instanceof Failed ?
    <StateMessage
      state={{
        kind: "error",
        title: "Couldn't load shifts",
        body: fetchErrorToString(state.error),
        action: <Button onClick={retry}>Try again</Button>,
      }}
    />
  : (state satisfies never)
}
```

`Ready([])` isn't `NotAsked`. `Content` shows the empty state for it, such as "No open shifts right now".

## 4. `StateMessage` or `NotificationBanner`

- **`StateMessage`** says what a region holds: `loading`, `empty`, or a read that failed, with a way to retry.
- **Action feedback** uses `data-testid="notification-banner"` (FR-11.4). Claim, cancel, post and upload report errors inline and show successes in a Sonner toast that closes after four seconds. Show server messages exactly as they came.

A blocked claim is a normal failure with a clear message. `shift-claim-button` stays visible and enabled for a nurse with a lapsed credential, and the banner explains (FR-4.2). Don't hide or disable it on the client.

## 5. Container / presentational split

The screen component owns state and the exhaustive match, nothing else. A presentational `Content` receives the resolved value and renders. The table is its own component. Keep each child small and prop-typed, and in the same page file (`CLAUDE.md`).

## 6. Composed `Future` data layer

Build the read as a composition, not nested forks:

- `.map` projects a field off a response (`listShifts → result.shifts`).
- `Future.concurrently({ a, b })` runs independent reads together and joins them into one object.
- `.chain` sequences a dependent step (list → per-row detail).
- `Future.mapConcurrently(fn, list)` fans out over the list.

Only the screen's `useEffect` forks. The layer stays lazy until then.

## Do / Do not

- Do: start a page file using hooks with `"use client"`.
- Do: gate on `useSession` and handle `Checking` as its own state.
- Do: model the screen as one `RemoteData` **data** cell seeded `Loading()`, and `.fork` inside `useEffect`.
- Do: return `fork`'s cancel from the effect, and key the effect on its inputs (`[attempt]`).
- Do: end the render match with `(state satisfies never)`.
- Do: compose the read (`concurrently`, `mapConcurrently`, `chain`, `map`) and fork once, at the screen.
- Do: give every region a loading, an empty and an error state.
- Do not: nest `.fork` calls, fire reads outside `useEffect`, or drop the cancel return.
- Do not: render off a non-exhaustive match.
- Do not: add a route per role or a redirect. FR-1.8 wants one landing screen per role.
- Do not: read `localStorage` or `window` during render.

## Examples

`api.listShifts`, `api.credential` and `api.timesheet` are `QueryEndpoint`s, read with `call(api.x, {})` (`./forms.md`). `api.getCredential` and `api.getNurse` below are illustrative: add the real entries with the first screen that needs them, and derive their types with `s.Infer`. A nurse's screen also holds `timesheet-table` and the credential form, left out here for length.

### The screen component: `RemoteData` cell + exhaustive match

The screen owns one `RemoteData` cell, fills it with `fetchNurseScreen().fork` in `useEffect` (returning the cancel), and renders an exhaustive `instanceof … satisfies never` match. `NurseScreenData` is the resolved shape the rest of the example builds and consumes.

```tsx
type Shift = s.Infer<typeof api.listShifts.response>["shifts"][number]
type Credential = s.Infer<typeof api.getCredential.response>

type NurseScreenData = {
  shifts: Shift[]
  credential: Credential
}

function NurseScreen() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState<RemoteData<FetchError, NurseScreenData>>(Loading())

  useEffect(
    () =>
      fetchNurseScreen().fork(
        (error) => setState(Failed(error)),
        (data) => setState(Ready(data))
      ),
    [attempt]
  )

  const retry = () => {
    setState(Loading())
    setAttempt((n) => n + 1)
  }

  return (
    <PageShell title="Shifts" Icon={Calendar03Icon}>
      {state instanceof Ready ?
        <Content data={state.value} />
      : state instanceof Loading || state instanceof NotAsked ?
        <StateMessage state={{ kind: "loading", label: "Loading shifts" }} />
      : state instanceof Failed ?
        <StateMessage
          state={{
            kind: "error",
            title: "Couldn't load shifts",
            body: fetchErrorToString(state.error),
            action: <Button onClick={retry}>Try again</Button>,
          }}
        />
      : (state satisfies never)}
    </PageShell>
  )
}
```

### Container / presentational split

`Content` is presentational: it receives the resolved value and renders. Each open shift is a `shift-list-item` with its own `shift-claim-button` (FR-3.2). Table row mapping: `./tables.md`.

```tsx
function Content({ data }: { data: NurseScreenData }) {
  const open = data.shifts.filter((shift) => shift.status === "open")
  if (open.length === 0) {
    return (
      <StateMessage
        state={{
          kind: "empty",
          title: "No open shifts right now",
          body: "New shifts appear here as agencies post them.",
        }}
      />
    )
  }
  return (
    <ShiftLedger
      rows={open}
      renderRow={(shift) => (
        <ShiftRow
          key={shift.id}
          shift={shift}
          data-testid="shift-list-item"
          who={<span className="truncate text-secondary">{shift.agencyName}</span>}
          actions={<Button data-testid="shift-claim-button">Claim shift</Button>}
        />
      )}
    />
  )
}
```

### The composed `Future` data layer

Each read is a small `Future`, and they compose without nested forks. `.map` projects a field, and `Future.concurrently` runs the independent reads together. Nothing executes until the screen's `useEffect` forks `fetchNurseScreen`.

```tsx
function fetchShifts(): Future<FetchError, Shift[]> {
  return call(api.listShifts, {}).map((result) => result.shifts)
}

function fetchNurseScreen(): Future<FetchError, NurseScreenData> {
  return Future.concurrently<FetchError, NurseScreenData>({
    shifts: fetchShifts(),
    credential: call(api.getCredential, {}),
  })
}
```

`.chain` and `Future.mapConcurrently` take a list to per-row reads, such as the covering nurse's name for each filled shift (FR-5.1). Prefer a route whose reply already joins that data. The fan-out is for when none exists.

```tsx
type Coverage = { shift: Shift; nurse: s.Infer<typeof api.getNurse.response> | null }

function fetchCoverageRow(shift: Shift): Future<FetchError, Coverage> {
  return shift.claimedBy === null ?
      Future.resolve({ shift, nurse: null })
    : call(api.getNurse, { id: shift.claimedBy }).map((nurse) => ({ shift, nurse }))
}

function fetchCoverage(): Future<FetchError, Coverage[]> {
  return fetchShifts().chain((shifts) => Future.mapConcurrently(fetchCoverageRow, shifts))
}
```
