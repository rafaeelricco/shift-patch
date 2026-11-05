"use client"

export default Page

import Image from "next/image"
import { type ChangeEvent, type FormEvent, type ReactNode, useCallback, useEffect, useRef, useState } from "react"

import { HugeiconsIcon } from "@hugeicons/react"
import {
  Logout01Icon,
  Mail01Icon,
  SidebarLeft01Icon,
  SquareLock02Icon,
  UnfoldMoreIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"

import { useSession } from "@hooks/use-session"
import { signIn, signOut } from "@lib/session"
import { Future, type Cancel } from "@lib/future"
import { Duration, POSIX, type DateOnly } from "@lib/time"
import { FACILITY_TIMEZONE, facilityToday } from "@lib/facility"
import { Failed, Loading, NotAsked, Ready, type RemoteData } from "@lib/remote-data"
import { BadStatus, call, upload, type FetchError } from "@api/request"
import {
  api,
  type AdminShift,
  type AuditEntry,
  type CancelReason,
  type CredentialSummary,
  type NewShift,
  type Shift,
  type TimesheetRow,
  type User,
} from "@api/endpoints"
import { Button } from "@ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@ui/dropdown-menu"
import { FormInput, SelectInput, TextInput, useForm } from "@ui/forms"
import { NotificationBanner, type Notice } from "@ui/notification-banner"
import { StateMessage } from "@ui/state-message"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import "./page.css"
import { cn } from "@lib/utils"
import { ShiftCard } from "@ui/shift-card"
import { StatusBadge } from "@ui/status-badge"
import { FileField } from "@ui/field"
import { ColumnDef, DataTable, comparator, type ColumnsConfig, type SortState } from "@ui/datatable"

/** One entrance: the sign-in card, the post form, sections after sign-in. Reduced motion fades instead. */
const riseIn = "shiftpatch-page-rise-in"
const surfaceCard = "rounded-2xl bg-card shadow-hairline"

function Page() {
  const session = useSession()
  switch (session.type) {
    case "Checking":
      return <StateMessage state={{ kind: "loading", label: "Loading" }} />
    case "SignedOut":
      // Design canvas A4: a 401 to a signed-in request lands here once, with the reason carried by lib/session.
      return <LoginForm expired={session.expired} />
    case "SignedIn":
      return <RoleScreen key={session.user.id.value} user={session.user} />
    default:
      return session satisfies never
  }
}

// Design canvas "Sign in": one card, one solid action, one message slot (Login-States, Edge-Cases A1-A2).
// No client-side validation: the form is noValidate and the server's 401 reports an empty or wrong entry.
// While `expired` and nothing has been tried yet, the banner reads "Session expired, sign in again".
function LoginForm({ expired }: { expired: boolean }) {
  const [submit, setSubmit] = useState<RemoteData<FetchError, never>>(NotAsked())
  const [passwordVisible, setPasswordVisible] = useState(false)
  const cancel = useRef<Cancel>(() => {})
  useEffect(() => () => cancel.current(), [])

  const { fields, onSubmit } = useForm({
    fields: {
      email: new TextInput({
        label: "Email",
        type: "email",
        defaultValue: "",
        placeholder: "you@example.com",
        icon: Mail01Icon,
        input: { autoComplete: "username", inputMode: "email", "data-testid": "login-email-input" },
      }),
      password: new TextInput({
        label: "Password",
        type: "password",
        defaultValue: "",
        placeholder: "Enter your password",
        icon: SquareLock02Icon,
        input: { autoComplete: "current-password", "data-testid": "login-password-input" },
      }),
    },
  })

  const send = (event: FormEvent) =>
    void onSubmit((input) => {
      if (submit.isLoading) return
      setSubmit(Loading())
      cancel.current = signIn(input.email.trim(), input.password).fork(
        (error) => {
          setSubmit(Failed(error))
          fields.password.values.onChange("") // the email stays, the password clears (Login-States)
        },
        () => {} // the session commits, the gate swaps the screen, and this form unmounts
      )
    })(event)

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center bg-elevated-secondary px-6 py-8">
      <div className={cn(riseIn, "flex w-full max-w-sm flex-col")}>
        <form
          noValidate
          onSubmit={send}
          className={cn("shiftpatch-login-form", "flex flex-col gap-4 rounded-3xl bg-card p-6 shadow-hairline")}
          aria-label="Sign in"
        >
          <div className="flex justify-center">
            <Image src="/brand/mark.svg" alt="" width={38} height={41} />
          </div>
          <div className="flex flex-col gap-1 text-center">
            <h1 className="type-heading-md">Welcome back</h1>
            <p className="type-text-sm text-secondary">Enter your email and password.</p>
          </div>
          {submit instanceof Failed ?
            <NotificationBanner
              data-testid="notification-banner"
              notice={{ kind: "error", message: loginFailure(submit.error) }}
            />
          : expired && submit instanceof NotAsked ?
            <NotificationBanner
              data-testid="notification-banner"
              notice={{ kind: "error", message: "Session expired, sign in again" }}
            />
          : null}
          <FormInput config={fields.email} className={"shiftpatch-login-field"} disabled={submit.isLoading} />
          <div className="flex min-w-0 flex-col gap-2">
            <Label htmlFor={fields.password.values.id}>Password</Label>
            <div className="relative">
              <Input
                id={fields.password.values.id}
                name={fields.password.values.name}
                type={passwordVisible ? "text" : "password"}
                autoComplete="current-password"
                data-testid="login-password-input"
                placeholder="Enter your password"
                value={fields.password.values.value}
                onChange={(event) => fields.password.values.onChange(event.target.value)}
                disabled={submit.isLoading}
                className={cn("shiftpatch-login-field", "pr-10 pl-9")}
              />
              <HugeiconsIcon icon={SquareLock02Icon} className={"shiftpatch-login-icon"} aria-hidden="true" />
              <button
                type="button"
                aria-label={passwordVisible ? "Hide password" : "Show password"}
                aria-pressed={passwordVisible}
                disabled={submit.isLoading}
                onClick={() => setPasswordVisible((visible) => !visible)}
                className={"shiftpatch-password-toggle"}
              >
                <HugeiconsIcon icon={passwordVisible ? ViewOffSlashIcon : ViewIcon} aria-hidden="true" />
              </button>
            </div>
          </div>
          <Button
            type="submit"
            size="xl"
            className="w-full"
            loading={submit.isLoading}
            data-testid="login-submit-button"
          >
            Sign in
          </Button>
          <p className="text-center type-text-xs text-secondary">Demo with sample data only.</p>
        </form>
      </div>
    </main>
  )
}

/** Design canvas copy: a server reply shows as sent; anything else is one retryable line. */
function loginFailure(error: FetchError): string {
  return error instanceof BadStatus ? error.message : "Couldn't sign in, try again"
}

/** One landing screen per role (FR-1.8). Each actor phase fills its own sections. */
function RoleScreen({ user }: { user: User }) {
  switch (user.role) {
    case "nurse":
      return <NurseScreen user={user} />
    case "agency":
      return <AgencyScreen user={user} />
    case "admin":
      return <AdminScreen user={user} />
    default:
      return user.role satisfies never
  }
}

const SIDEBAR_COOKIE = "shiftpatch_sidebar"
const SIDEBAR_COOKIE_MAX_AGE = 7 * 24 * 60 * 60

/** The shell's --outer-radius less its --inset, so the account trigger and main frame nest inside the outer curve. */
const insetRadius = "rounded-[calc(var(--outer-radius)-var(--inset))]"

const accountRow = cn(
  insetRadius,
  "relative flex h-9 cursor-pointer items-center text-left text-sm text-secondary",
  "transition-colors duration-(--transition-duration-basic) ease-[ease] hover:bg-(--menu-item-background-color) hover:text-primary",
  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
)

const initials = (name: string) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()

/** Design canvas account control: avatar, name and role, opening a menu whose one item is Sign out. */
function AccountMenu({ user, folded = false }: { user: User; folded?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(accountRow, folded ? "w-full justify-center px-0" : "w-full justify-start gap-2 px-2")}
        aria-label={`Account: ${user.name}, ${user.role}`}
        title={folded ? user.name : undefined}
      >
        <span
          aria-hidden="true"
          className="flex size-7 flex-none items-center justify-center rounded-full type-text-xs font-semibold text-primary"
          style={{ background: "var(--color-background-callout-surface)" }}
        >
          {initials(user.name)}
        </span>
        {folded ? null : (
          <>
            <span className="flex min-w-0 flex-1 flex-col text-left">
              <span className="truncate type-text-sm font-medium text-primary">{user.name}</span>
              <span className="type-text-xs text-secondary">{user.role}</span>
            </span>
            <HugeiconsIcon icon={UnfoldMoreIcon} className="size-4 flex-none text-secondary" aria-hidden="true" />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
          <DropdownMenuItem onClick={signOut}>
            <HugeiconsIcon icon={Logout01Icon} aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SectionShell({
  user,
  title,
  banner,
  children,
}: {
  user: User
  title: string
  banner: ReactNode
  children: ReactNode
}) {
  // The signed-in shell first mounts in the browser, so it can use the saved width immediately.
  const [sidebarOpen, setSidebarOpen] = useState(() =>
    document.cookie.split(/;\s*/).includes(`${SIDEBAR_COOKIE}=expanded`)
  )
  const toggleSidebar = () => {
    const next = !sidebarOpen
    setSidebarOpen(next)
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "expanded" : "folded"}; Path=/; Max-Age=${SIDEBAR_COOKIE_MAX_AGE}; SameSite=Lax`
  }
  const sidebarLabel = sidebarOpen ? "Collapse sidebar" : "Expand sidebar"

  return (
    <div className="h-dvh">
      <div className="@container/section-shell flex h-full min-h-0 bg-elevated-secondary [--inset:8px] [--outer-radius:var(--radius-2xl)] [--shell-header-height:52px]">
        <aside
          id="dashboard-sidebar"
          aria-label="Sidebar"
          className={cn(
            "flex flex-none flex-col gap-2 overflow-hidden p-(--inset) transition-[width] duration-(--transition-duration-relaxed) ease-move motion-reduce:transition-none @max-[1000px]/section-shell:hidden",
            sidebarOpen ? "w-72" : "w-12"
          )}
        >
          <div
            className={cn(
              "flex h-(--shell-header-height) flex-none items-center gap-2 type-text-sm font-semibold text-primary",
              sidebarOpen ? "px-3" : "justify-center"
            )}
          >
            <Image
              src="/brand/mark.svg"
              alt={sidebarOpen ? "" : "ShiftPatch"}
              width={24}
              height={26}
              className="shrink-0"
            />
            {sidebarOpen ?
              <span>ShiftPatch</span>
            : null}
          </div>
          <div className="mt-auto">
            <AccountMenu user={user} folded={!sidebarOpen} />
          </div>
        </aside>
        <div
          className={cn(
            insetRadius,
            "relative my-(--inset) mr-(--inset) min-w-0 flex-1 overflow-y-auto bg-surface shadow-hairline",
            "@max-[1000px]/section-shell:m-0 @max-[1000px]/section-shell:rounded-none @max-[1000px]/section-shell:shadow-none"
          )}
        >
          <header className="sticky top-0 z-6 flex h-(--shell-header-height) items-center justify-between gap-3 border-b-[0.5px] border-default bg-surface px-2">
            <Button
              variant="ghost-primary"
              size="icon"
              className="@max-[1000px]/section-shell:hidden"
              aria-label={sidebarLabel}
              aria-expanded={sidebarOpen}
              aria-controls="dashboard-sidebar"
              title={sidebarLabel}
              onClick={toggleSidebar}
            >
              <HugeiconsIcon icon={SidebarLeft01Icon} aria-hidden="true" />
            </Button>
            <div className="hidden items-center gap-2 @max-[1000px]/section-shell:flex">
              <Image src="/brand/mark.svg" alt="" width={20} height={21} />
            </div>
            <h1 className="min-w-0 flex-none truncate type-heading-xs">{title}</h1>
            {/* The one banner slot sits in the top bar (design canvas), so it never covers content. */}
            {/* On a compact shell it drops just under the top bar instead; either way it overlays the content. */}
            <div
              className={cn(
                "flex min-w-0 flex-1 justify-end",
                "@max-[1000px]/section-shell:absolute @max-[1000px]/section-shell:inset-x-4 @max-[1000px]/section-shell:top-[calc(100%+8px)]",
                "@max-[1000px]/section-shell:justify-stretch @max-[1000px]/section-shell:[&>*]:flex-1"
              )}
              aria-live="polite"
            >
              {banner}
            </div>
            <div className="hidden w-56 @max-[1000px]/section-shell:flex">
              <AccountMenu user={user} />
            </div>
          </header>
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Shared screen helpers (the Agency and Admin screens reuse these exact names) ───────────────────────────────

/** FR-5.4: a change shows within 5 s. A 3 s poll plus one round trip stays under that. */
const POLL_EVERY = Duration.seconds(3)

type Polled<T> = { data: RemoteData<FetchError, T>; updatedAt: POSIX | null; stale: boolean; refresh: () => void }

/**
 * Design canvas "Everyone polls, quietly": reads now, then again 3 s after each read settles, and at once on
 * `refresh()`. The next read is scheduled only once the current one has answered, so a slow read is never cancelled
 * by the timer. A failed poll keeps the last good data and sets `stale` until the next good read; before any good
 * read it is `Failed`. It never touches the banner. The effect keys on `deps`, never on `read`'s identity.
 */
function usePoll<T>(
  read: () => Future<FetchError, T>,
  deps: ReadonlyArray<unknown>
): Polled<T> & { updateAndRefresh: (update: (value: T) => T) => void } {
  const [polled, setPolled] = useState<{ data: RemoteData<FetchError, T>; updatedAt: POSIX | null; stale: boolean }>({
    data: Loading(),
    updatedAt: null,
    stale: false,
  })
  const [tick, setTick] = useState(0)
  const stopPoll = useRef<Cancel>(() => {})
  const latestRead = useRef(read)
  useEffect(() => {
    latestRead.current = read
  })
  useEffect(() => {
    let timer: number | undefined
    const next = (): void => {
      timer = window.setTimeout(() => setTick((n) => n + 1), POLL_EVERY.asMilliseconds())
    }
    const cancel = latestRead.current().fork(
      (error) => {
        setPolled((prev) =>
          prev.data instanceof Ready ?
            { ...prev, stale: true }
          : { data: Failed(error), updatedAt: prev.updatedAt, stale: false }
        )
        next()
      },
      (value) => {
        setPolled({ data: Ready(value), updatedAt: POSIX.now(), stale: false })
        next()
      }
    )
    const stop = () => {
      cancel()
      window.clearTimeout(timer)
    }
    stopPoll.current = stop
    return stop
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the caller's deps plus the poll tick, not on `read`
  }, [...deps, tick])
  const refresh = useCallback(() => {
    stopPoll.current()
    setTick((n) => n + 1)
  }, [])
  const updateAndRefresh = useCallback(
    (update: (value: T) => T) => {
      setPolled((prev) => (prev.data instanceof Ready ? { ...prev, data: Ready(update(prev.data.value)) } : prev))
      refresh()
    },
    [refresh]
  )
  return { ...polled, refresh, updateAndRefresh }
}

/** The quiet line beside a polled section's heading while `stale`. Never a banner. */
function StaleNote({ stale, updatedAt }: { stale: boolean; updatedAt: POSIX | null }) {
  if (!stale || updatedAt === null) return null
  const at = updatedAt.toLocalDateAndTime(FACILITY_TIMEZONE).time.pretty().slice(0, 5)
  return <p className="type-text-xs text-secondary tabular-nums">{`Couldn't refresh, showing ${at}`}</p>
}

/**
 * What a failed action says (design canvas copy): a string as-is, the server's own words for a 4xx (FR-4.2 needs them
 * exact), and the action's own "Couldn't …, try again" line for a network failure, a 5xx or an undecodable reply.
 */
function failureMessage(error: FetchError | string, offline: string): string {
  if (typeof error === "string") return error
  if (error instanceof BadStatus && error.status < 500) return error.message
  return offline
}

type Banner = {
  notice: Notice | null
  succeed: (message: string) => void
  fail: (error: FetchError | string, offline: string) => void
  clear: () => void
}

/** One notice per screen. It stays until the next action or sign-out. Each action clears it first; polls never touch it. */
function useBanner(): Banner {
  const [notice, setNotice] = useState<Notice | null>(null)
  const succeed = useCallback((message: string) => setNotice({ kind: "success", message }), [])
  const fail = useCallback(
    (error: FetchError | string, offline: string) =>
      setNotice({ kind: "error", message: failureMessage(error, offline) }),
    []
  )
  const clear = useCallback(() => setNotice(null), [])
  return { notice, succeed, fail, clear }
}

function BannerSlot({ notice, action }: { notice: Notice | null; action?: ReactNode }) {
  if (notice === null) return null
  return (
    <div className="flex min-w-0 items-center gap-2">
      <NotificationBanner data-testid="notification-banner" notice={notice} className="min-w-0" />
      {action}
    </div>
  )
}

/**
 * Design canvas "Repeat presses do nothing": one task per key at a time, so claim and cancel buttons stay enabled
 * (FR-4.2). `busy` holds the keys in flight for buttons that may show `loading`; claim and cancel never read it.
 */
function useSingleFlight(): {
  run: (key: string, task: () => Future<FetchError, unknown>) => void
  busy: ReadonlySet<string>
} {
  const inFlight = useRef(new Map<string, Cancel>())
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set())
  useEffect(() => {
    const running = inFlight.current
    return () => running.forEach((cancel) => cancel())
  }, [])
  const run = useCallback((key: string, task: () => Future<FetchError, unknown>) => {
    const running = inFlight.current
    if (running.has(key)) return
    let settled = false
    const settle = (): void => {
      settled = true
      running.delete(key)
      setBusy((prev) => new Set([...prev].filter((k) => k !== key)))
    }
    running.set(key, () => {})
    setBusy((prev) => new Set(prev).add(key))
    const cancel = task().fork(settle, settle)
    if (!settled) running.set(key, cancel)
  }, [])
  return { run, busy }
}

function SectionHead({
  id,
  title,
  polled,
}: {
  id: string
  title: string
  polled?: { stale: boolean; updatedAt: POSIX | null }
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h2 id={`${id}-title`} tabIndex={-1} className="type-heading-sm outline-none">
        {title}
      </h2>
      {polled === undefined ? null : <StaleNote stale={polled.stale} updatedAt={polled.updatedAt} />}
    </div>
  )
}

function LoadFailed({ title, retry }: { title: string; retry: () => void }) {
  return (
    <StateMessage
      state={{
        kind: "error",
        title,
        body: "Check your connection, then try again.",
        action: (
          <Button variant="outline-primary" onClick={retry}>
            Try again
          </Button>
        ),
      }}
    />
  )
}

// ─── Scheduled hours (every role) ──────────────────────────────────────────────────────────────────────────────

const loadTimesheet = (): Future<FetchError, ReadonlyArray<TimesheetRow>> =>
  call(api.timesheet, {}).map(({ rows }) => rows)

const byTimesheetDate = (a: TimesheetRow, b: TimesheetRow): number =>
  a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
const TIMESHEET_COLUMNS = {
  nurse: new ColumnDef<TimesheetRow>({ label: "Nurse", sortFun: (a, b) => a.nurseName.localeCompare(b.nurseName) }),
  agency: new ColumnDef<TimesheetRow>({ label: "Agency", sortFun: (a, b) => a.agencyName.localeCompare(b.agencyName) }),
  date: new ColumnDef<TimesheetRow>({ label: "Date", sortFun: byTimesheetDate, className: "w-32" }),
  times: new ColumnDef<TimesheetRow>({ label: "Times", sortFun: null, className: "w-40" }),
  hours: new ColumnDef<TimesheetRow>({
    label: "Scheduled hours",
    sortFun: (a, b) => a.hours - b.hours,
    align: "right",
    className: "w-40",
  }),
} satisfies ColumnsConfig<TimesheetRow>

/**
 * FR-9.1. All three roles render it, so `timesheet-table` is always mounted; loading, error and empty show as a row
 * inside ("Tables never unmount"). The server scopes rows by role (FR-9.3).
 */
function TimesheetSection({ user }: { user: User }) {
  const timesheet = usePoll(loadTimesheet, [user.id.value])
  return <TimesheetTable timesheet={timesheet} />
}

/** The section itself, for a screen that also reads the rows (the agency names its covering nurses from them). */
function TimesheetTable({ timesheet }: { timesheet: Polled<ReadonlyArray<TimesheetRow>> }) {
  const [sort, setSort] = useState<SortState>({ sorting: "decreasing", column: "date" })
  const data = timesheet.data
  const rows = data instanceof Ready ? [...data.value].sort(comparator(TIMESHEET_COLUMNS, sort)) : []
  const emptyMessage =
    data instanceof Failed ? <LoadFailed title="Couldn't load scheduled hours" retry={timesheet.refresh} />
    : data instanceof Ready ?
      <>
        <p className="type-text-sm text-primary">No scheduled hours yet</p>
        <p className="mt-1 type-text-sm text-secondary">Shifts appear here once they&apos;re claimed.</p>
      </>
    : <span className={cn("shiftpatch-page-shimmer", "type-text-sm")}>Loading scheduled hours</span>
  return (
    <section id="hours" aria-labelledby="hours-title" className="flex scroll-mt-16 flex-col gap-3">
      <SectionHead id="hours" title="Scheduled hours" polled={timesheet} />
      <DataTable
        data-testid="timesheet-table"
        columns={TIMESHEET_COLUMNS}
        columnOrder={["nurse", "agency", "date", "times", "hours"]}
        rows={rows.map((r) => ({
          key: r.shiftId,
          value: r,
          contents: {
            nurse: r.nurseName,
            agency: r.agencyName,
            date: <span className="tabular-nums">{r.date}</span>,
            times: <span className="tabular-nums">{`${r.startTime} to ${r.endTime}`}</span>,
            hours: <span className="tabular-nums">{r.hours.toLocaleString()}</span>,
          },
        }))}
        emptyMessage={emptyMessage}
        sort={sort}
        onSortChange={setSort}
      />
    </section>
  )
}

// ─── Nurse ─────────────────────────────────────────────────────────────────────────────────────────────────────

const EXPIRED_MESSAGE = "Credential expired, cannot claim shift"
const loadShifts = (): Future<FetchError, ReadonlyArray<Shift>> => call(api.listShifts, {}).map(({ shifts }) => shifts)
const loadCredential = (): Future<FetchError, CredentialSummary> => call(api.credential, {})

/** Design canvas "maria-far": the shift ends after the approved expiry. An overnight shift ends the next day. */
function endsAfter(shift: Shift, expiresOn: DateOnly): boolean {
  const expiry = expiresOn.pretty()
  return shift.endTime < shift.startTime ? shift.date >= expiry : shift.date > expiry
}

function focusLater(selector: string): void {
  window.requestAnimationFrame(() => document.querySelector<HTMLElement>(selector)?.focus())
}

function NurseScreen({ user }: { user: User }) {
  const shifts = usePoll(loadShifts, [user.id.value])
  const credential = usePoll(loadCredential, [user.id.value])
  const banner = useBanner()
  const { run } = useSingleFlight()
  const focusAfterCommit = useRef<string | null>(null)
  useEffect(() => {
    const selector = focusAfterCommit.current
    focusAfterCommit.current = null
    if (selector !== null) document.querySelector<HTMLElement>(selector)?.focus()
  })
  const refreshAll = (): void => {
    shifts.refresh()
    credential.refresh()
  }
  // Each action reports its own outcome and refreshes, failed ones too.
  const report = <T extends Shift>(
    task: Future<FetchError, T>,
    succeeded: string,
    offline: string,
    focus: (value: T) => string
  ) =>
    task.bimap(
      (error) => {
        banner.fail(error, offline)
        refreshAll()
        return error
      },
      (value) => {
        focusAfterCommit.current = focus(value)
        shifts.updateAndRefresh((rows) => rows.map((row) => (row.id === value.id ? value : row)))
        credential.refresh()
        banner.succeed(succeeded)
        return value
      }
    )

  // Claim and cancel never pass `loading`, so the buttons stay enabled (FR-4.2); single-flight drops repeat presses.
  const claim = (shift: Shift): void =>
    run(`claim:${shift.id}`, () => {
      banner.clear()
      return report(
        call(api.claimShift, { id: shift.id }, {}),
        "Shift claimed",
        "Couldn't claim shift, try again",
        (updated) => `[data-mine="${updated.id}"]`
      )
    })
  const cancel = (shift: Shift): void =>
    run(`cancel:${shift.id}`, () => {
      banner.clear()
      // FR-6.8: a nurse's cancel is always "advance", in one click with no confirmation (FR-6.7).
      return report(
        call(api.cancelShift, { id: shift.id }, { reason: "advance" }).map(
          ({ cancellation: _cancellation, ...updated }) => updated
        ),
        "Shift cancelled, now open",
        "Couldn't cancel shift, try again",
        () => "#open-title"
      )
    })
  const toUpload = (): void => {
    document.getElementById("credential")?.scrollIntoView({ block: "start" })
    focusLater('[data-testid="credential-upload-input"]')
  }

  const summary = credential.data instanceof Ready ? credential.data.value : null
  const blocked = banner.notice?.kind === "error" && banner.notice.message === EXPIRED_MESSAGE
  return (
    <SectionShell
      user={user}
      title="Shifts"
      banner={
        <BannerSlot
          notice={banner.notice}
          action={
            blocked ?
              <Button variant="ghost-primary" size="sm" onClick={toUpload}>
                Upload renewal
              </Button>
            : undefined
          }
        />
      }
    >
      <div className={cn(riseIn, "flex flex-col gap-10 p-6")}>
        <div className="grid gap-10 lg:grid-cols-2">
          <OpenShifts polled={shifts} credential={summary} onClaim={claim} />
          <YourShifts polled={shifts} nurseId={user.id.value} onCancel={cancel} />
        </div>
        <CredentialPanel polled={credential} banner={banner} onUploaded={refreshAll} />
        <TimesheetSection user={user} />
      </div>
    </SectionShell>
  )
}

function OpenShifts({
  polled,
  credential,
  onClaim,
}: {
  polled: Polled<ReadonlyArray<Shift>>
  credential: CredentialSummary | null
  onClaim: (shift: Shift) => void
}) {
  const data = polled.data
  const approved = credential?.approved ?? null
  const lapsed = credential !== null && (approved === null || approved.state === "expired")
  const inReview = credential?.latest?.status === "pending"
  const open =
    data instanceof Ready ?
      [...data.value]
        .filter((s) => s.status === "open")
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    : []
  return (
    <section id="open" aria-labelledby="open-title" className="flex scroll-mt-16 flex-col gap-3">
      <SectionHead id="open" title="Open shifts" polled={polled} />
      {lapsed ?
        <p className="rounded-xl p-3 type-text-sm" style={{ background: "var(--color-background-caution-surface)" }}>
          {inReview ?
            "Your renewal is in review. Claims stay refused until it's approved."
          : `Your credential expired${approved === null ? "" : ` on ${approved.expiresOn.pretty()}`}, so claims will be refused. Submit a renewal under Credential.`
          }
        </p>
      : null}
      {data instanceof Ready ?
        open.length === 0 ?
          <StateMessage
            state={{
              kind: "empty",
              title: "No open shifts right now",
              body: "New shifts appear here as agencies post them.",
            }}
          />
        : <div className="flex flex-col gap-3">
            {open.map((shift) => (
              <ShiftCard
                key={shift.id}
                data-testid="shift-list-item"
                shift={shift}
                {...(approved !== null && approved.state === "valid" && endsAfter(shift, approved.expiresOn) ?
                  { detail: "Ends after your credential expires" }
                : {})}
                action={
                  <Button data-testid="shift-claim-button" onClick={() => onClaim(shift)}>
                    Claim shift
                  </Button>
                }
              />
            ))}
          </div>

      : data instanceof Failed ?
        <LoadFailed title="Couldn't load shifts" retry={polled.refresh} />
      : <StateMessage state={{ kind: "loading", label: "Loading shifts" }} />}
    </section>
  )
}

function YourShifts({
  polled,
  nurseId,
  onCancel,
}: {
  polled: Polled<ReadonlyArray<Shift>>
  nurseId: string
  onCancel: (shift: Shift) => void
}) {
  const data = polled.data
  const mine =
    data instanceof Ready ?
      [...data.value]
        .filter((s) => s.claimedBy === nurseId)
        .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime))
    : []
  return (
    <section id="mine" aria-labelledby="mine-title" className="flex scroll-mt-16 flex-col gap-3">
      <SectionHead id="mine" title="Your shifts" polled={polled} />
      {data instanceof Ready ?
        mine.length === 0 ?
          <StateMessage
            state={{ kind: "empty", title: "Nothing claimed yet", body: "Shifts you claim appear here." }}
          />
        : <div className="flex flex-col gap-3">
            {mine.map((shift) => (
              <ShiftCard
                key={shift.id}
                shift={shift}
                data-mine={shift.id}
                tabIndex={-1}
                className="outline-none"
                action={
                  <Button variant="outline-danger" data-testid="shift-cancel-button" onClick={() => onCancel(shift)}>
                    Cancel shift
                  </Button>
                }
              />
            ))}
          </div>

      : data instanceof Failed ?
        <LoadFailed title="Couldn't load your shifts" retry={polled.refresh} />
      : <StateMessage state={{ kind: "loading", label: "Loading your shifts" }} />}
    </section>
  )
}

function CredentialPanel({
  polled,
  banner,
  onUploaded,
}: {
  polled: Polled<CredentialSummary>
  banner: Banner
  onUploaded: () => void
}) {
  const data = polled.data
  const summary = data instanceof Ready ? data.value : null
  const approved = summary?.approved ?? null
  const latest = summary?.latest ?? null
  const soon =
    approved !== null && approved.state === "valid" && approved.expiresOn.compare(facilityToday().addMonths(1)) < 0
  return (
    <section id="credential" aria-labelledby="credential-title" className="flex scroll-mt-16 flex-col gap-3">
      <SectionHead id="credential" title="Credential" polled={polled} />
      <div className="grid gap-6 md:grid-cols-2">
        <CredentialForm
          solid={summary !== null && approved?.state !== "valid"}
          banner={banner}
          onUploaded={onUploaded}
        />
        {data instanceof Failed ?
          <LoadFailed title="Couldn't load your credential" retry={polled.refresh} />
        : summary === null ?
          <StateMessage state={{ kind: "loading", label: "Loading your credential" }} />
        : <dl className="flex flex-col gap-3">
            <div data-slot="credential-row" className={cn(surfaceCard, "flex items-center justify-between gap-3 p-4")}>
              <div>
                <dt className="type-text-sm text-secondary">On file</dt>
                <dd className="type-heading-xs tabular-nums">
                  {approved === null ? "None on file" : approved.expiresOn.pretty()}
                </dd>
                {soon ?
                  <dd className="type-text-xs text-secondary">Expires in under 30 days</dd>
                : null}
              </div>
              {approved === null ? null : <StatusBadge status={approved.state} />}
            </div>
            <div data-slot="credential-row" className={cn(surfaceCard, "flex items-center justify-between gap-3 p-4")}>
              <div>
                <dt className="type-text-sm text-secondary">Latest upload</dt>
                <dd className="type-heading-xs tabular-nums">
                  {latest === null ? "No upload yet" : latest.expiresOn.pretty()}
                </dd>
              </div>
              {latest === null ? null : <StatusBadge status={latest.status} />}
            </div>
          </dl>
        }
      </div>
    </section>
  )
}

function CredentialForm({ solid, banner, onUploaded }: { solid: boolean; banner: Banner; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | undefined>(undefined)
  const [attempt, setAttempt] = useState(0) // remounts the file input after a successful upload
  const [submit, setSubmit] = useState<RemoteData<FetchError, never>>(NotAsked())
  const cancel = useRef<Cancel>(() => {})
  useEffect(() => () => cancel.current(), [])

  const { fields, onSubmit, reset } = useForm({
    fields: {
      expiry: new TextInput({
        label: "Expiry date",
        type: "date",
        defaultValue: "",
        input: { "data-testid": "credential-expiry-date-input" },
      }),
    },
  })

  const send = (event: FormEvent) =>
    void onSubmit((values) => {
      if (submit.isLoading) return
      // Field errors only before sending: no request, banner untouched.
      if (file === null) return setFileError("Choose a document to upload")
      if (file.size > api.uploadCredential.maxBytes) return setFileError("File must be 4 MB or smaller")
      banner.clear()
      setSubmit(Loading())
      cancel.current = upload(api.uploadCredential, file, { "X-Expiry-Date": values.expiry }).fork(
        (error) => {
          setSubmit(NotAsked())
          banner.fail(error, "Couldn't upload document, try again") // the file and date stay
          onUploaded()
        },
        () => {
          setSubmit(NotAsked())
          setFile(null)
          setAttempt((n) => n + 1)
          reset()
          banner.succeed("Credential submitted for review")
          onUploaded()
        }
      )
    })(event)

  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-4" aria-label="Upload a renewal">
      <FileField
        key={attempt}
        label="Credential document"
        hint="PDF, PNG or JPEG, up to 4 MB. Use a sample file, not a real document."
        accept=".pdf,.png,.jpg,.jpeg"
        data-testid="credential-upload-input"
        error={fileError}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setFile(event.target.files?.[0] ?? null)
          setFileError(undefined)
        }}
      />
      <FormInput config={fields.expiry} disabled={submit.isLoading} />
      <Button
        type="submit"
        variant={solid ? "solid-primary" : "outline-primary"}
        className="self-start"
        loading={submit.isLoading}
      >
        Submit for review
      </Button>
    </form>
  )
}

// ─── Agency ────────────────────────────────────────────────────────────────────────────────────────────────────

const SHIFT_ROLES = ["RN", "LPN"] as const
const CANCEL_REASONS = [
  { value: "advance", label: "Cancelled in advance" },
  { value: "no-show", label: "No-show" },
] as const satisfies ReadonlyArray<{ value: CancelReason; label: string }>

/**
 * The two polls can disagree after a cancel and reclaim, so a timesheet row names the cover only while its nurse still
 * holds the shift; otherwise the card falls back to "Covered by a nurse".
 */
const coverKey = (shiftId: string, nurseId: string): string => `${shiftId}:${nurseId}`

/** FR-1.10: posting, the agency's own shifts with cancel, and scheduled hours on one screen. Each section polls. */
function AgencyScreen({ user }: { user: User }) {
  const agencyId = user.id.value
  const shifts = usePoll(() => call(api.agencyShifts, { agencyId }).map(({ shifts }) => shifts), [agencyId])
  // FR-2.11's covering nurse: a Shift carries only `claimedBy`, and the agency-scoped timesheet names it (FR-9.3).
  const covers = usePoll(loadTimesheet, [agencyId])
  const banner = useBanner()
  const { run } = useSingleFlight()
  const [posting, setPosting] = useState(false)
  // While a post is in flight the form must stay mounted, or its unmount would abort the request unreported (FR-11.4).
  const [sending, setSending] = useState(false)
  const refreshAll = (): void => {
    shifts.refresh()
    covers.refresh()
  }
  const posted = (shift: Shift): void => {
    setPosting(false)
    // A poll that landed while the POST was in flight may already hold it.
    shifts.updateAndRefresh((rows) => (rows.some((row) => row.id === shift.id) ? rows : [...rows, shift]))
    focusLater('[data-testid="agency-post-shift-button"]')
  }
  // FR-6.7 and FR-6.8: one click, with the reason chosen beside the button. No confirmation step.
  const cancel = (shift: Shift, reason: CancelReason): void =>
    run(`cancel:${shift.id}`, () => {
      banner.clear()
      return call(api.cancelShift, { id: shift.id }, { reason }).bimap(
        (error) => {
          banner.fail(error, "Couldn't cancel shift, try again")
          refreshAll()
          return error
        },
        ({ cancellation: _cancellation, ...updated }) => {
          shifts.updateAndRefresh((rows) => rows.map((row) => (row.id === updated.id ? updated : row)))
          covers.refresh()
          banner.succeed("Shift cancelled, now open")
          focusLater("#agency-shifts-title") // the card loses its button as it reopens
          return updated
        }
      )
    })
  const names: ReadonlyMap<string, string> = new Map(
    covers.data instanceof Ready ?
      covers.data.value.map((row) => [coverKey(row.shiftId, row.nurseId), row.nurseName] as const)
    : []
  )
  return (
    <SectionShell user={user} title="Your shifts" banner={<BannerSlot notice={banner.notice} />}>
      <div className={cn(riseIn, "flex flex-col gap-10 p-6")}>
        <AgencyShifts
          polled={shifts}
          names={names}
          posting={posting}
          sending={sending}
          onTogglePost={() => setPosting((open) => !open)}
          onSending={setSending}
          banner={banner}
          onPosted={posted}
          onCancel={cancel}
        />
        <TimesheetTable timesheet={covers} />
      </div>
    </SectionShell>
  )
}

function AgencyShifts({
  polled,
  names,
  posting,
  sending,
  onTogglePost,
  onSending,
  banner,
  onPosted,
  onCancel,
}: {
  polled: Polled<ReadonlyArray<Shift>>
  names: ReadonlyMap<string, string>
  posting: boolean
  sending: boolean
  onTogglePost: () => void
  onSending: (sending: boolean) => void
  banner: Banner
  onPosted: (shift: Shift) => void
  onCancel: (shift: Shift, reason: CancelReason) => void
}) {
  const data = polled.data
  const rows =
    data instanceof Ready ?
      [...data.value].sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    : []
  return (
    <section id="agency-shifts" aria-labelledby="agency-shifts-title" className="flex scroll-mt-16 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHead id="agency-shifts" title="Your agency's shifts" polled={polled} />
        {/* One solid action per view: this button while closed, the form's submit while open. */}
        <Button
          variant={posting ? "outline-primary" : "solid-primary"}
          data-testid="agency-post-shift-button"
          aria-expanded={posting}
          aria-controls="post-shift"
          disabled={sending}
          onClick={onTogglePost}
        >
          Post a shift
        </Button>
      </div>
      {/* PostShiftPattern: opens inline, never in a modal. Closing unmounts it, so it reopens on its defaults. */}
      {posting ?
        <PostShiftForm banner={banner} onSending={onSending} onPosted={onPosted} />
      : null}
      {data instanceof Ready ?
        rows.length === 0 ?
          <StateMessage
            state={{ kind: "empty", title: "No shifts posted yet", body: "Shifts you post appear here." }}
          />
        : <div className="flex flex-col gap-3">
            {rows.map((shift) =>
              shift.claimedBy === null ?
                <ShiftCard key={shift.id} shift={shift} detail="Waiting for a nurse" />
              : <AgencyFilledCard
                  key={shift.id}
                  shift={shift}
                  nurse={names.get(coverKey(shift.id, shift.claimedBy)) ?? null}
                  onCancel={onCancel}
                />
            )}
          </div>

      : data instanceof Failed ?
        <LoadFailed title="Couldn't load your shifts" retry={polled.refresh} />
      : <StateMessage state={{ kind: "loading", label: "Loading your shifts" }} />}
    </section>
  )
}

/** AgencyCancelPattern. Each card owns its form, so its reason mounts with it and defaults to advance (FR-6.8). */
function AgencyFilledCard({
  shift,
  nurse,
  onCancel,
}: {
  shift: Shift
  nurse: string | null // null until the timesheet names a freshly claimed shift; an ID never goes into prose
  onCancel: (shift: Shift, reason: CancelReason) => void
}) {
  const { fields, values } = useForm({
    fields: {
      reason: new SelectInput({
        label: "Reason",
        items: CANCEL_REASONS,
        defaultValue: "advance",
        getValue: (reason) => reason.value,
        getLabel: (reason) => reason.label,
      }),
    },
  })
  const reason = CANCEL_REASONS.find((one) => one.value === values.reason)?.value ?? "advance"
  return (
    <ShiftCard
      shift={shift}
      detail={nurse === null ? "Covered by a nurse" : `Covered by ${nurse}`}
      action={
        <>
          <FormInput config={fields.reason} />
          <Button variant="outline-danger" data-testid="shift-cancel-button" onClick={() => onCancel(shift, reason)}>
            Cancel shift
          </Button>
        </>
      }
    />
  )
}

/** PostShiftPattern after forms.md "post a shift": valid defaults (FR-2.10); an earlier end is overnight (FR-2.6). */
function PostShiftForm({
  banner,
  onSending,
  onPosted,
}: {
  banner: Banner
  onSending: (sending: boolean) => void
  onPosted: (shift: Shift) => void
}) {
  const [submit, setSubmit] = useState<RemoteData<FetchError, never>>(NotAsked())
  const cancel = useRef<Cancel>(() => {})
  useEffect(() => () => cancel.current(), [])

  const { fields, onSubmit } = useForm({
    fields: {
      role: new SelectInput({
        label: "Role",
        items: SHIFT_ROLES,
        defaultValue: "RN",
        getValue: (role) => role,
        getLabel: (role) => role,
      }),
      date: new TextInput({ label: "Date", type: "date", defaultValue: facilityToday().pretty() }),
      startTime: new TextInput({ label: "Start", type: "time", defaultValue: "07:00" }),
      endTime: new TextInput({
        label: "End",
        type: "time",
        defaultValue: "19:00",
        description: "Earlier than Start means overnight",
      }),
    },
    validate: (values) => ({
      role: values.role === null ? "Pick a role" : null,
      date: values.date === "" ? "Pick a date" : null,
      startTime: values.startTime === "" ? "Enter a start time" : null,
      endTime:
        values.endTime === "" ? "Enter an end time"
        : values.startTime === values.endTime ? "Start and end must differ"
        : null,
    }),
  })

  const send = (event: FormEvent) =>
    void onSubmit(({ role, date, startTime, endTime }) => {
      if (submit.isLoading) return
      const shiftRole = SHIFT_ROLES.find((one) => one === role)
      if (shiftRole === undefined) return // validate has rejected this; the find narrows the type
      // A native time input may report seconds; the API takes HH:mm (time.md).
      const body: NewShift = { role: shiftRole, date, startTime: startTime.slice(0, 5), endTime: endTime.slice(0, 5) }
      banner.clear()
      setSubmit(Loading())
      onSending(true)
      cancel.current = call(api.postShift, body).fork(
        (error) => {
          setSubmit(NotAsked())
          onSending(false)
          banner.fail(error, "Couldn't post shift, try again") // the values stay
        },
        (shift) => {
          setSubmit(NotAsked())
          onSending(false)
          banner.succeed("Shift posted")
          onPosted(shift)
        }
      )
    })(event)

  return (
    <form
      id="post-shift"
      noValidate
      onSubmit={send}
      className={cn(riseIn, surfaceCard, "flex flex-col gap-4 p-4")}
      aria-label="Post a shift"
    >
      <FormInput config={fields.role} disabled={submit.isLoading} />
      <FormInput config={fields.date} disabled={submit.isLoading} />
      <div className="grid grid-cols-2 gap-4">
        <FormInput config={fields.startTime} disabled={submit.isLoading} />
        <FormInput config={fields.endTime} disabled={submit.isLoading} />
      </div>
      <Button type="submit" className="w-full" loading={submit.isLoading} data-testid="agency-post-shift-submit-button">
        Post shift
      </Button>
    </form>
  )
}

// ─── Admin ─────────────────────────────────────────────────────────────────────────────────────────────────────

const loadAdminShifts = (): Future<FetchError, ReadonlyArray<AdminShift>> =>
  call(api.adminShifts, {}).map(({ shifts }) => shifts)
const loadAuditLog = (): Future<FetchError, ReadonlyArray<AuditEntry>> =>
  call(api.auditLog, {}).map(({ entries }) => entries)

/** FR-1.11: coverage, scheduled hours and the audit log on one screen. Each section polls on its own (FR-5.4). */
function AdminScreen({ user }: { user: User }) {
  return (
    <SectionShell user={user} title="Coverage" banner={null}>
      <div className={cn(riseIn, "flex flex-col gap-10 p-6")}>
        <CoverageSection user={user} />
        <TimesheetSection user={user} />
        <AuditSection user={user} />
      </div>
    </SectionShell>
  )
}

const byShiftDate = (a: AdminShift, b: AdminShift): number =>
  a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)
const COVERAGE_COLUMNS = {
  agency: new ColumnDef<AdminShift>({ label: "Agency", sortFun: (a, b) => a.agencyName.localeCompare(b.agencyName) }),
  role: new ColumnDef<AdminShift>({
    label: "Role",
    sortFun: (a, b) => a.role.localeCompare(b.role),
    className: "w-20",
  }),
  date: new ColumnDef<AdminShift>({ label: "Date", sortFun: byShiftDate, className: "w-32" }),
  times: new ColumnDef<AdminShift>({ label: "Times", sortFun: null, className: "w-40" }),
  nurse: new ColumnDef<AdminShift>({
    label: "Covering nurse",
    sortFun: (a, b) => (a.nurseName ?? "").localeCompare(b.nurseName ?? ""),
  }),
  status: new ColumnDef<AdminShift>({
    label: "Status",
    sortFun: (a, b) => a.status.localeCompare(b.status),
    className: "w-28",
  }),
} satisfies ColumnsConfig<AdminShift>

/** Design system AdminCoveragePattern: a stat card. While nothing has loaded, the figure is a dash, never 0. */
function CoverageStat({ status, count }: { status: "open" | "filled"; count: number | null }) {
  const label = status === "open" ? "Open shifts" : "Filled shifts"
  return (
    <div role="group" aria-label={label} className={cn(surfaceCard, "flex flex-col gap-1 p-4")}>
      <div className="flex items-center justify-between gap-2">
        <span className="type-text-sm text-secondary">{label}</span>
        <StatusBadge status={status} />
      </div>
      <p className="type-heading-xl text-primary tabular-nums">{count === null ? "—" : count.toLocaleString()}</p>
      <p className="type-text-xs text-secondary">{status === "open" ? "Waiting for a nurse" : "Covered by a nurse"}</p>
    </div>
  )
}

/** FR-5.1 to FR-5.3: open and filled counts, then every shift with its covering nurse and API status. */
function CoverageSection({ user }: { user: User }) {
  const shifts = usePoll(loadAdminShifts, [user.id.value])
  const [sort, setSort] = useState<SortState>({ sorting: "increasing", column: "date" })
  const data = shifts.data
  const all = data instanceof Ready ? data.value : null
  const rows = all === null ? [] : [...all].sort(comparator(COVERAGE_COLUMNS, sort))
  const count = (status: "open" | "filled") => (all === null ? null : all.filter((x) => x.status === status).length)
  const emptyMessage =
    data instanceof Failed ? <LoadFailed title="Couldn't load shifts" retry={shifts.refresh} />
    : data instanceof Ready ?
      <>
        <p className="type-text-sm text-primary">No shifts yet</p>
        <p className="mt-1 type-text-sm text-secondary">Shifts appear here once an agency posts them.</p>
      </>
    : <span className={cn("shiftpatch-page-shimmer", "type-text-sm")}>Loading shifts</span>
  return (
    <section id="coverage" aria-labelledby="coverage-title" className="flex scroll-mt-16 flex-col gap-3">
      <SectionHead id="coverage" title="All shifts" polled={shifts} />
      <div className="grid gap-3 sm:grid-cols-2">
        <CoverageStat status="open" count={count("open")} />
        <CoverageStat status="filled" count={count("filled")} />
      </div>
      <DataTable
        data-testid="admin-dashboard-shift-table"
        columns={COVERAGE_COLUMNS}
        columnOrder={["agency", "role", "date", "times", "nurse", "status"]}
        rows={rows.map((r) => ({
          key: r.id,
          value: r,
          contents: {
            agency: r.agencyName,
            role: <span className="font-mono">{r.role}</span>,
            date: <span className="tabular-nums">{r.date}</span>,
            times: <span className="tabular-nums">{`${r.startTime} to ${r.endTime}`}</span>,
            nurse: r.nurseName ?? "—",
            status: <StatusBadge data-testid="admin-shift-status-badge" status={r.status} />,
          },
        }))}
        emptyMessage={emptyMessage}
        sort={sort}
        onSortChange={setSort}
      />
    </section>
  )
}

const AUDIT_COLUMNS = {
  time: new ColumnDef<AuditEntry>({ label: "Time", sortFun: (a, b) => a.at.compare(b.at), className: "w-40" }),
  actor: new ColumnDef<AuditEntry>({ label: "Actor", sortFun: null }),
  action: new ColumnDef<AuditEntry>({ label: "Action", sortFun: null }),
  record: new ColumnDef<AuditEntry>({ label: "Record", sortFun: null }),
  reason: new ColumnDef<AuditEntry>({ label: "Reason", sortFun: null }),
  previous: new ColumnDef<AuditEntry>({ label: "Previous nurse", sortFun: null }),
} satisfies ColumnsConfig<AuditEntry>

/** Facility-local `2026-10-03 07:00`, sans with tabular-nums. */
function auditTime(at: POSIX): string {
  const { date, time } = at.toLocalDateAndTime(FACILITY_TIMEZONE)
  return `${date.pretty()} ${time.pretty().slice(0, 5)}`
}

/** FR-8.1 and FR-6.6: read-only, newest first. Reason and previous nurse are set by cancellations, otherwise a dash. */
function AuditSection({ user }: { user: User }) {
  const log = usePoll(loadAuditLog, [user.id.value])
  const [sort, setSort] = useState<SortState>({ sorting: "decreasing", column: "time" })
  const data = log.data
  const rows = data instanceof Ready ? [...data.value].sort(comparator(AUDIT_COLUMNS, sort)) : []
  const emptyMessage =
    data instanceof Failed ? <LoadFailed title="Couldn't load the audit log" retry={log.refresh} />
    : data instanceof Ready ?
      <>
        <p className="type-text-sm text-primary">No activity yet</p>
        <p className="mt-1 type-text-sm text-secondary">Claims, cancellations and uploads appear here.</p>
      </>
    : <span className={cn("shiftpatch-page-shimmer", "type-text-sm")}>Loading the audit log</span>
  return (
    <section id="audit" aria-labelledby="audit-title" className="flex scroll-mt-16 flex-col gap-3">
      <SectionHead id="audit" title="Audit log" polled={log} />
      <DataTable
        data-testid="audit-log-table"
        columns={AUDIT_COLUMNS}
        columnOrder={["time", "actor", "action", "record", "reason", "previous"]}
        rows={rows.map((e) => ({
          key: e.id,
          value: e,
          contents: {
            time: <span className="tabular-nums">{auditTime(e.at)}</span>,
            actor: e.actorName ?? (e.actorId === null ? "System" : <span className="font-mono">{e.actorId}</span>),
            action: <span className="font-mono">{e.action}</span>,
            record: <span className="font-mono">{e.recordId}</span>,
            reason: e.reason === null ? "—" : <span className="font-mono">{e.reason}</span>,
            previous: e.previousNurseName ?? e.previousNurseId ?? "—",
          },
        }))}
        emptyMessage={emptyMessage}
        sort={sort}
        onSortChange={setSort}
      />
    </section>
  )
}
