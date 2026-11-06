"use client"

export default Page

import Image from "next/image"
import {
  type ChangeEvent,
  type ComponentProps,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"
import { toast, Toaster } from "sonner"
import {
  Activity01Icon,
  Add01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Alert02Icon,
  ArrowDown01Icon,
  Calendar03Icon,
  Cancel01Icon,
  Clock03Icon,
  File01Icon,
  FileUploadIcon,
  HourglassIcon,
  InformationCircleIcon,
  LicenseIcon,
  Logout01Icon,
  Mail01Icon,
  Moon02Icon,
  SidebarLeft01Icon,
  Sun03Icon,
  Tick02Icon,
  UnavailableIcon,
  UserRemove01Icon,
  SquareLock02Icon,
  UnfoldMoreIcon,
  ViewIcon,
  ViewOffSlashIcon,
} from "@hugeicons/core-free-icons"

import { useSession } from "@hooks/use-session"
import { signIn, signOut } from "@lib/session"
import { Future, type Cancel } from "@lib/future"
import { DateOnly, Duration, POSIX } from "@lib/time"
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
import { FormInput, TextInput, useForm } from "@ui/forms"
import { HoldButton } from "@ui/hold-button"
import { NotificationBanner, type Notice } from "@ui/notification-banner"
import { StateMessage } from "@ui/state-message"
import { Input } from "@ui/input"
import { Label } from "@ui/label"
import "./page.css"
import { cn } from "@lib/utils"
import { surfaceCard } from "@ui/surface-card"
import { StatusBadge } from "@ui/status-badge"
import { FileField, fieldFrame, fieldMessage } from "@ui/field"
import { AlertCircleIcon } from "@ui/icons"
import { Popover, PopoverContent, PopoverTrigger } from "@ui/popover"
import { ScrollArea } from "@ui/scroll-area"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@ui/sheet"
import { ColumnDef, DataTable, comparator, type ColumnsConfig, type SortState } from "@ui/datatable"

/** One entrance: the sign-in card, the post form, sections after sign-in. Reduced motion fades instead. */
const riseIn = "shiftpatch-page-rise-in"
/** Design `.sp-page`: one centred column, 1200px wide, 32px between sections; tighter on a compact shell. */
const pageBody = cn(
  "mx-auto flex w-full max-w-300 flex-col gap-8 px-6 pt-6 pb-12",
  "@max-[1000px]/section-shell:gap-6 @max-[1000px]/section-shell:px-4 @max-[1000px]/section-shell:pb-24"
)

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
  toastId,
  action,
  polled,
  children,
}: {
  user: User
  title: string
  banner: ReactNode
  toastId?: ActionToastId | undefined
  /** The screen's one solid action (agency: Post a shift), at the right end of the top bar. */
  action?: ReactNode
  /** The screen's main poll; the top bar says whether it is current. */
  polled?: { stale: boolean; updatedAt: POSIX | null }
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
          <header className="sticky top-0 z-6 flex h-(--shell-header-height) items-center justify-between gap-3 border-b-[0.5px] border-default bg-surface pr-4 pl-2 @max-[1000px]/section-shell:pr-2">
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
            {polled === undefined ? null : <LiveNote stale={polled.stale} updatedAt={polled.updatedAt} />}
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
            {
              action === undefined ? null
                // On a compact shell the action leaves the crowded bar and is pinned above the thumb (design canvas).
              : (
                <div className="flex-none @max-[1000px]/section-shell:fixed @max-[1000px]/section-shell:inset-x-4 @max-[1000px]/section-shell:bottom-4 @max-[1000px]/section-shell:z-6 @max-[1000px]/section-shell:[&>*]:h-11 @max-[1000px]/section-shell:[&>*]:w-full">
                  {action}
                </div>
              )
            }
            <div className="hidden w-56 @max-[1000px]/section-shell:flex">
              <AccountMenu user={user} />
            </div>
          </header>
          {children}
        </div>
      </div>
      {toastId === undefined ? null : (
        <Toaster
          key={toastId}
          position="top-right"
          offset={{ top: 68, right: 24 }}
          mobileOffset={{ top: 64, right: 16, left: 16 }}
          visibleToasts={1}
          duration={4000}
          toastOptions={{
            unstyled: true,
            classNames: {
              toast:
                "flex w-fit max-w-full items-center gap-2 rounded-xl bg-success-surface px-gutter-md py-3 type-text-sm font-medium text-primary inset-ring inset-ring-border-success-surface focus-visible:outline-2! focus-visible:outline-ring!",
            },
          }}
          icons={{
            success: <HugeiconsIcon icon={Tick02Icon} className="size-5 text-icon-success" aria-hidden="true" />,
          }}
        />
      )}
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
 * Design `.sp-live`: a 6px dot and one quiet line beside the top bar's title. It never animates and never becomes a
 * banner; each section still carries its own StaleNote. Hidden on a compact shell, where the dot alone would mislead.
 */
function LiveNote({ stale, updatedAt }: { stale: boolean; updatedAt: POSIX | null }) {
  if (updatedAt === null) return null
  const at = updatedAt.toLocalDateAndTime(FACILITY_TIMEZONE).time.pretty().slice(0, 5)
  return (
    <p className="flex flex-none items-center gap-1.5 type-text-xs text-secondary tabular-nums @max-[1000px]/section-shell:hidden">
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", stale ? "bg-icon-warning" : "bg-icon-success")} />
      {stale ? `Reconnecting. Showing data from ${at}` : "Updated just now"}
    </p>
  )
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

type ActionToastId = ReturnType<typeof toast.success>
type ActionNotice = Extract<Notice, { kind: "error" }> | { kind: "success"; toastId: ActionToastId }

type Banner = {
  notice: ActionNotice | null
  succeed: (message: string) => void
  fail: (error: FetchError | string, offline: string) => void
  clear: () => void
}

/** Errors stay in context. Sonner dismisses success confirmations automatically. */
function useBanner(): Banner {
  const [notice, setNotice] = useState<ActionNotice | null>(null)
  const activeToast = useRef<ActionToastId | undefined>(undefined)
  const dismiss = useCallback(() => {
    if (activeToast.current === undefined) return
    toast.dismiss(activeToast.current)
    activeToast.current = undefined
  }, [])
  useEffect(() => dismiss, [dismiss])
  const succeed = useCallback(
    (message: string) => {
      dismiss()
      const toastId = toast.success(message, { testId: "notification-banner" })
      activeToast.current = toastId
      // Each success gets a fresh Toaster so an outgoing toast cannot overlap the next outcome.
      setNotice({ kind: "success", toastId })
    },
    [dismiss]
  )
  const fail = useCallback(
    (error: FetchError | string, offline: string) => {
      dismiss()
      setNotice({ kind: "error", message: failureMessage(error, offline) })
    },
    [dismiss]
  )
  const clear = useCallback(() => {
    dismiss()
    setNotice(null)
  }, [dismiss])
  return { notice, succeed, fail, clear }
}

function BannerSlot({ notice, action }: { notice: ActionNotice | null; action?: ReactNode }) {
  if (notice?.kind !== "error") return null
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

/** Design `.sp-sec-head`: a quiet title with an optional count and hint, and a filter at the far end. */
function SectionHead({
  id,
  title,
  polled,
  count,
  hint,
  tools,
}: {
  id: string
  title: string
  polled?: { stale: boolean; updatedAt: POSIX | null }
  count?: number | undefined
  hint?: string
  tools?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="flex min-w-0 flex-col">
        <div className="flex flex-wrap items-baseline gap-x-3">
          {/* The count sits beside the heading, not in it, so the section's name stays its title. */}
          <span className="flex items-baseline gap-1.5">
            <h2 id={`${id}-title`} tabIndex={-1} className="type-heading-xs outline-none">
              {title}
            </h2>
            {count === undefined ? null : (
              <span className="type-heading-xs font-normal text-secondary tabular-nums">{count.toLocaleString()}</span>
            )}
          </span>
          {polled === undefined ? null : <StaleNote stale={polled.stale} updatedAt={polled.updatedAt} />}
        </div>
        {hint === undefined ? null : <p className="type-text-xs text-secondary">{hint}</p>}
      </div>
      {tools}
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

/** Design "Filter finds nothing": says which filter, offers the way back. */
function FilterEmpty({ title, body, onReset }: { title: string; body: string; onReset: () => void }) {
  return (
    <div className={cn(surfaceCard, "flex flex-col items-center gap-1 px-6 py-8 text-center")}>
      <p className="type-heading-xs">{title}</p>
      <p className="type-text-sm text-secondary">{body}</p>
      <Button variant="ghost-primary" size="sm" className="mt-2" onClick={onReset}>
        Show all shifts
      </Button>
    </div>
  )
}

// ─── Shift labels and the day ledger (every role) ──────────────────────────────────────────────────────────────

type ShiftTimes = { startTime: string; endTime: string }
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

/** "Sat 2026-10-03" (design canvas). Shift dates are facility-local strings and are never converted (time.md). */
function dayLabel(date: string): string {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number)
  return `${WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]} ${date}`
}

/** An end earlier than the start reads as the next day everywhere (FR-2.6). */
const overnight = (shift: ShiftTimes): boolean => shift.endTime < shift.startTime

/** "19:00 to 07:00 next day". */
const timesLabel = (shift: ShiftTimes): string =>
  `${shift.startTime} to ${shift.endTime}${overnight(shift) ? " next day" : ""}`

const minutesOf = (time: string): number => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number)
  return hours * 60 + minutes
}

/** Scheduled hours as the server counts them (FR-9.2): end minus start, plus a day when it runs overnight. */
function hoursOf(shift: ShiftTimes): number {
  const span = minutesOf(shift.endTime) - minutesOf(shift.startTime)
  return (span < 0 ? span + 24 * 60 : span) / 60
}

/** The quiet word beside a day group's date. */
function dayRel(date: string): string | null {
  const today = facilityToday().pretty()
  if (date === today) return "Today"
  if (date === facilityToday().addDays(1).pretty()) return "Tomorrow"
  return date < today ? "Past date" : null
}

/** Upcoming days first unless the caller lists shifts newest first. */
function byDay<T extends ShiftTimes & { date: string }>(
  rows: ReadonlyArray<T>,
  newestFirst: boolean
): ReadonlyArray<{ date: string; rows: ReadonlyArray<T> }> {
  const today = facilityToday().pretty()
  const groups = new Map<string, Array<T>>()
  for (const row of rows) groups.set(row.date, [...(groups.get(row.date) ?? []), row])
  const dates = [...groups.keys()].sort((a, b) => {
    if (newestFirst) return b.localeCompare(a)
    const pastA = a < today
    const pastB = b < today
    if (pastA !== pastB) return pastA ? 1 : -1
    return pastA ? b.localeCompare(a) : a.localeCompare(b)
  })
  return dates.map((date) => ({
    date,
    rows: [...(groups.get(date) ?? [])].sort((a, b) =>
      newestFirst ? b.startTime.localeCompare(a.startTime) : a.startTime.localeCompare(b.startTime)
    ),
  }))
}

const segmentFace = cva(
  cn(
    "relative z-1 flex items-center justify-center rounded-full px-3.5 font-semibold whitespace-nowrap text-secondary",
    "transition-colors duration-(--transition-duration-basic) ease-basic",
    "peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring"
  ),
  {
    variants: {
      size: {
        md: "min-h-7 text-[13px] leading-5",
        lg: "min-h-8 type-text-sm font-semibold",
      },
    },
    defaultVariants: { size: "md" },
  }
)

/**
 * Design `.sp-seg`: native radios drawn as a pill track with a sliding thumb, so arrow keys, labels and
 * `getByRole("radio")` all work. The thumb is framed by a hairline; surfaces cast no shadow (design system).
 */
function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  size,
  block = false,
}: {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  block?: boolean
} & VariantProps<typeof segmentFace>) {
  const name = useId()
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value)
  )
  return (
    <div
      role="radiogroup"
      aria-label={label}
      style={{ "--i": index, "--n": options.length } as CSSProperties}
      className={cn(
        "relative [grid-auto-columns:minmax(0,1fr)] grid-flow-col gap-0.5 rounded-full bg-(--segmented-control-background) p-0.5",
        block ? "grid w-full" : "inline-grid"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0.5 left-0.5 w-[calc((100%-4px-2px*(var(--n)-1))/var(--n))] rounded-full bg-(--segmented-control-thumb-background) shadow-hairline",
          "translate-x-[calc((100%+2px)*var(--i))] transition-transform duration-(--transition-duration-basic) ease-move motion-reduce:transition-none"
        )}
      />
      {options.map((option) => (
        <label key={option.value} className="relative flex cursor-pointer">
          <input
            type="radio"
            name={name}
            className="peer absolute inset-0 z-2 size-full cursor-pointer appearance-none opacity-0"
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span className={cn(segmentFace({ size }), "w-full")}>{option.label}</span>
        </label>
      ))}
    </div>
  )
}

/**
 * Design `.sp-panel` of `.sp-day` groups: the date heads each group. Rows render as the caller's
 * `ShiftRow`s, so each screen keeps its own test IDs and actions.
 */
function ShiftLedger<T extends Shift>({
  rows,
  renderRow,
  newestFirst = false,
}: {
  rows: ReadonlyArray<T>
  renderRow: (shift: T) => ReactNode
  newestFirst?: boolean
}) {
  return (
    <div className={cn(surfaceCard, "@container/ledger")}>
      {byDay(rows, newestFirst).map((day) => {
        const rel = dayRel(day.date)
        return (
          <div
            key={day.date}
            className="relative not-first:before:absolute not-first:before:inset-x-0 not-first:before:top-0 not-first:before:h-px not-first:before:scale-y-50 not-first:before:bg-(--color-border)"
          >
            <h3 className="flex gap-1.5 px-4 pt-3 type-text-xs font-semibold text-secondary tabular-nums">
              <span>{dayLabel(day.date)}</span>
              {rel === null ? null : <span className="font-normal">{rel}</span>}
            </h3>
            <div className="py-1">{day.rows.map(renderRow)}</div>
          </div>
        )
      })}
    </div>
  )
}

const shiftRow = cva(
  cn(
    "relative grid min-h-15 items-center gap-x-4 gap-y-2 px-4 py-2 outline-none",
    "not-first:before:absolute not-first:before:inset-x-4 not-first:before:top-0 not-first:before:h-px not-first:before:scale-y-50 not-first:before:bg-(--color-border-subtle)",
    "transition-colors duration-(--transition-duration-relaxed) ease-basic data-new:bg-info-soft",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
  ),
  {
    variants: {
      columns: {
        // when | what | status | actions
        status:
          "grid-cols-[minmax(190px,1fr)_minmax(0,1.2fr)_56px_minmax(0,auto)] @max-[559px]/ledger:grid-cols-[minmax(0,1fr)_auto]",
        // when | what | actions (the section identifies the status)
        plain: "grid-cols-[minmax(190px,1fr)_minmax(0,1.1fr)_auto] @max-[559px]/ledger:grid-cols-[minmax(0,1fr)_auto]",
      },
    },
    defaultVariants: { columns: "status" },
  }
)

/**
 * Design `.sp-row`, one shift in reading order: time and hours, role and person, status, action. The date lives in
 * the group head, so the row repeats it for screen readers; text locators find "2026-10-02, 19:00 to 07:00" too.
 */
function ShiftRow({
  shift,
  who,
  note,
  actions,
  columns,
  className,
  ...rest
}: {
  shift: Shift
  who: ReactNode
  note?: ReactNode
  actions?: ReactNode
} & VariantProps<typeof shiftRow> &
  Omit<ComponentProps<"article">, "children">) {
  return (
    <article className={cn(shiftRow({ columns }), className)} {...rest}>
      <div className="flex min-w-0 items-center gap-2.5">
        <HugeiconsIcon
          icon={overnight(shift) ? Moon02Icon : Sun03Icon}
          className="size-4.5 flex-none text-secondary"
          aria-hidden="true"
        />
        <div className="flex min-w-0 flex-col">
          <span className="font-medium tabular-nums">
            <span className="sr-only">{`${shift.date}, `}</span>
            {timesLabel(shift)}
          </span>
          <span className="type-text-xs text-secondary">{`${hoursOf(shift).toLocaleString()} scheduled hours`}</span>
        </div>
      </div>
      <div className="flex min-w-0 flex-col @max-[559px]/ledger:col-start-1">
        <span className="font-medium">{shift.role}</span>
        {who}
        {note}
      </div>
      {columns === "plain" ? null : (
        <div className="@max-[559px]/ledger:col-start-2 @max-[559px]/ledger:row-start-1 @max-[559px]/ledger:justify-self-end">
          <StatusBadge status={shift.status} />
        </div>
      )}
      <div className="flex items-center justify-end gap-1 @max-[559px]/ledger:col-start-2 @max-[559px]/ledger:row-start-2">
        {actions}
      </div>
    </article>
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
        <p className="mt-1 type-text-sm text-secondary">Hours appear when a shift is filled.</p>
      </>
    : <span className={cn("shiftpatch-page-shimmer", "type-text-sm")}>Loading scheduled hours</span>
  return (
    <section id="hours" aria-labelledby="hours-title" className="flex scroll-mt-17 flex-col gap-3">
      <SectionHead
        id="hours"
        title="Scheduled hours"
        hint="From claimed shifts. Nobody clocks in."
        polled={timesheet}
      />
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

function focusLater(selector: string, fallbackSelector?: string): void {
  window.requestAnimationFrame(() => {
    const target =
      document.querySelector<HTMLElement>(selector) ??
      (fallbackSelector === undefined ? null : document.querySelector<HTMLElement>(fallbackSelector))
    target?.focus()
  })
}

function NurseScreen({ user }: { user: User }) {
  const shifts = usePoll(loadShifts, [user.id.value])
  const credential = usePoll(loadCredential, [user.id.value])
  const banner = useBanner()
  const { run } = useSingleFlight()
  const [renewalOpen, setRenewalOpen] = useState<boolean | null>(null)
  const focusAfterCommit = useRef<string | null>(null)
  useEffect(() => {
    const selector = focusAfterCommit.current
    focusAfterCommit.current = null
    if (selector !== null) document.querySelector<HTMLElement>(selector)?.focus()
  })
  const refreshAll = (next?: CredentialSummary): void => {
    shifts.refresh()
    if (next === undefined) credential.refresh()
    else credential.updateAndRefresh(() => next)
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
      // FR-6.8: a nurse's cancel is always "advance".
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
    setRenewalOpen(true)
    document.getElementById("credential")?.scrollIntoView({ block: "start" })
    focusLater('[data-testid="credential-upload-input"]')
  }

  const summary = credential.data instanceof Ready ? credential.data.value : null
  const blocked = banner.notice?.kind === "error" && banner.notice.message === EXPIRED_MESSAGE
  return (
    <SectionShell
      user={user}
      title="Shifts"
      polled={shifts}
      toastId={banner.notice?.kind === "success" ? banner.notice.toastId : undefined}
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
      <div className={cn(riseIn, pageBody, "@container/cols")}>
        <OpenShifts polled={shifts} credential={summary} onClaim={claim} />
        <div className="grid grid-cols-1 gap-6 @min-[880px]/cols:grid-cols-2">
          <YourShifts polled={shifts} nurseId={user.id.value} onCancel={cancel} />
          <CredentialPanel
            polled={credential}
            banner={banner}
            onUploaded={refreshAll}
            renewalOpen={renewalOpen}
            onRenewalOpenChange={setRenewalOpen}
          />
        </div>
        <TimesheetSection user={user} />
      </div>
    </SectionShell>
  )
}

type TimeOfDayFilter = "all" | "day" | "night"
const TIME_OF_DAY_FILTERS = [
  { value: "all", label: "All" },
  { value: "day", label: "Day" },
  { value: "night", label: "Night" },
] as const satisfies ReadonlyArray<{ value: TimeOfDayFilter; label: string }>

function OpenShifts({
  polled,
  credential,
  onClaim,
}: {
  polled: Polled<ReadonlyArray<Shift>>
  credential: CredentialSummary | null
  onClaim: (shift: Shift) => void
}) {
  const [filter, setFilter] = useState<TimeOfDayFilter>("all")
  const data = polled.data
  const approved = credential?.approved ?? null
  const lapsed = credential !== null && (approved === null || approved.state === "expired")
  const inReview = credential?.latest?.status === "pending"
  const open = data instanceof Ready ? data.value.filter((s) => s.status === "open") : []
  const shown = filter === "all" ? open : open.filter((shift) => (filter === "night") === overnight(shift))
  return (
    <section id="open" aria-labelledby="open-title" className="flex min-w-0 scroll-mt-17 flex-col gap-3">
      <SectionHead
        id="open"
        title="Open shifts"
        count={data instanceof Ready ? open.length : undefined}
        polled={polled}
        tools={
          <SegmentedControl
            label="Filter open shifts by time of day"
            options={TIME_OF_DAY_FILTERS}
            value={filter}
            onChange={setFilter}
          />
        }
      />
      {lapsed ?
        <Callout tone={inReview ? "info" : "warning"} icon={inReview ? HourglassIcon : Alert02Icon}>
          {inReview ?
            "Your renewal is in review. Claims stay refused until it's approved."
          : `Your credential expired${approved === null ? "" : ` on ${approved.expiresOn.pretty()}`}, so claims will be refused. Submit a renewal under Credential.`
          }
        </Callout>
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
        : shown.length === 0 ?
          <FilterEmpty
            title={`No ${filter} shifts open`}
            body="Other open shifts are still available."
            onReset={() => setFilter("all")}
          />
        : <ShiftLedger
            rows={shown}
            renderRow={(shift) => {
              const short = approved !== null && approved.state === "valid" && endsAfter(shift, approved.expiresOn)
              return (
                <ShiftRow
                  key={shift.id}
                  data-testid="shift-list-item"
                  shift={shift}
                  who={<span className="truncate type-text-sm text-secondary">{shift.agencyName}</span>}
                  note={
                    short ?
                      <span className="flex items-start gap-1 type-text-xs text-(--color-text-warning-surface)">
                        <HugeiconsIcon icon={Alert02Icon} className="mt-0.5 size-3.5 flex-none" aria-hidden="true" />
                        {`Ends after your credential expires on ${approved.expiresOn.pretty()}`}
                      </span>
                    : undefined
                  }
                  actions={
                    // Stays enabled when the credential won't cover it: the banner gives the exact reason (FR-4.2).
                    <Button
                      data-testid="shift-claim-button"
                      variant={lapsed || short ? "outline-primary" : "solid-primary"}
                      onClick={() => onClaim(shift)}
                    >
                      Claim shift
                    </Button>
                  }
                />
              )
            }}
          />

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
  const mine = data instanceof Ready ? data.value.filter((shift) => shift.claimedBy === nurseId) : []
  const today = facilityToday().pretty()
  return (
    <section id="mine" aria-labelledby="mine-title" className="flex scroll-mt-17 flex-col gap-3">
      <SectionHead id="mine" title="Your shifts" polled={polled} />
      {data instanceof Ready ?
        mine.length === 0 ?
          // Keep the empty state quieter than the section heading.
          <div className={cn(surfaceCard, "flex flex-col gap-1 px-4 py-6 text-center")}>
            <p className="type-text-sm font-medium">Nothing claimed yet</p>
            <p className="type-text-sm text-secondary">Shifts you claim appear here.</p>
          </div>
        : <ShiftLedger
            rows={mine}
            newestFirst
            renderRow={(shift) => (
              <ShiftRow
                key={shift.id}
                shift={shift}
                data-mine={shift.id}
                tabIndex={-1}
                columns="plain"
                who={<span className="truncate type-text-sm text-secondary">{shift.agencyName}</span>}
                note={
                  shift.date < today ?
                    <span className="type-text-xs text-secondary">Cancelling removes its scheduled hours.</span>
                  : undefined
                }
                actions={
                  <HoldButton variant="outline-danger" data-testid="shift-cancel-button" onHold={() => onCancel(shift)}>
                    Hold to cancel
                  </HoldButton>
                }
              />
            )}
          />

      : data instanceof Failed ?
        <LoadFailed title="Couldn't load your shifts" retry={polled.refresh} />
      : <StateMessage state={{ kind: "loading", label: "Loading your shifts" }} />}
    </section>
  )
}

const credentialDateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

function CredentialDate({ date }: { date: DateOnly }) {
  const iso = date.pretty().padStart(10, "0")
  return (
    <time dateTime={iso} className="font-medium text-primary tabular-nums">
      {credentialDateFormat.format(new Date(`${iso}T00:00:00Z`))}
    </time>
  )
}

const credentialRow = "flex min-w-0 flex-col gap-3 p-4"
const credentialIcon =
  "flex size-8 flex-none items-center justify-center rounded-lg bg-elevated-secondary text-secondary"

function CredentialHeading({
  id,
  icon,
  title,
  subtitle,
  badge,
}: {
  id: string
  icon: IconSvgElement
  title: string
  subtitle: string
  badge?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className={credentialIcon}>
          <HugeiconsIcon icon={icon} className="size-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h3 id={id} className="type-heading-xs">
            {title}
          </h3>
          <p className="type-text-sm text-secondary">{subtitle}</p>
        </div>
      </div>
      {badge}
    </div>
  )
}

/** Status first: the credential used for claims stays separate from renewal activity. */
function CredentialPanel({
  polled,
  banner,
  onUploaded,
  renewalOpen,
  onRenewalOpenChange,
}: {
  polled: Polled<CredentialSummary>
  banner: Banner
  onUploaded: (next?: CredentialSummary) => void
  renewalOpen: boolean | null
  onRenewalOpenChange: (open: boolean) => void
}) {
  const data = polled.data
  const summary = data instanceof Ready ? data.value : null
  const approved = summary?.approved ?? null
  const latest = summary?.latest ?? null
  const valid = approved?.state === "valid"
  const inReview = latest?.status === "pending"
  const soon = valid && approved.expiresOn.compare(facilityToday().addDays(30)) < 0
  const needsCredential = summary !== null && !valid && !inReview
  const expanded = renewalOpen ?? needsCredential
  const renewalLabel =
    inReview ? "Replace upload"
    : approved === null ? "Upload a credential"
    : "Upload a renewal"
  const renewalTrigger = useRef<HTMLButtonElement>(null)
  const renewalForm = useRef<HTMLDivElement>(null)
  return (
    <section id="credential" aria-labelledby="credential-title" className="flex scroll-mt-17 flex-col gap-3">
      <SectionHead id="credential" title="Credential" polled={polled} />
      <div className={surfaceCard}>
        {data instanceof Failed ?
          <div className="p-4">
            <LoadFailed title="Couldn't load your credential" retry={polled.refresh} />
          </div>
        : summary === null ?
          <StateMessage state={{ kind: "loading", label: "Loading your credential" }} />
        : <section aria-labelledby="credential-current-title" className={credentialRow}>
            <CredentialHeading
              id="credential-current-title"
              icon={LicenseIcon}
              title="Current credential"
              subtitle="Used to check shift eligibility"
              badge={
                approved === null ? undefined : (
                  <StatusBadge status={approved.state} label={valid ? "Approved" : "Expired"} />
                )
              }
            />
            <div className="flex flex-col gap-1 type-text-sm text-secondary">
              {approved === null ?
                <p className="font-medium text-primary">No approved credential</p>
              : <p className="flex flex-wrap gap-x-2">
                  <span>{valid ? "Valid through" : "Expired on"}</span>
                  <CredentialDate date={approved.expiresOn} />
                </p>
              }
              <p>
                {valid ?
                  "Covers shifts ending on or before this date."
                : "An approved credential is required to claim shifts."}
              </p>
              {soon ?
                <p className="type-text-xs text-(--color-text-warning-surface)">Expires in under 30 days</p>
              : null}
            </div>
          </section>
        }
        <section
          aria-labelledby="credential-renewal-title"
          className={cn(credentialRow, "border-t-[0.5px] border-default")}
        >
          <CredentialHeading
            id="credential-renewal-title"
            icon={FileUploadIcon}
            title="Renewal"
            subtitle={
              inReview ? "Waiting for approval"
              : latest === null ?
                "Upload a document for review"
              : "Last submitted document"
            }
            badge={
              latest === null ? undefined : (
                <StatusBadge
                  status={latest.status}
                  label={
                    inReview ? "In review"
                    : latest.status === "approved" ?
                      "Approved"
                    : "Rejected"
                  }
                />
              )
            }
          />
          {latest === null ? null : (
            <div className="flex min-w-0 flex-col gap-1 type-text-sm text-secondary">
              <p className="flex items-start gap-1.5 font-medium text-primary">
                <HugeiconsIcon
                  icon={File01Icon}
                  className="mt-0.5 size-4 flex-none text-secondary"
                  aria-hidden="true"
                />
                <span className="break-all">{latest.fileName}</span>
              </p>
              <p className="flex flex-wrap gap-x-2">
                <span>{inReview ? "Proposed expiry" : "Submitted expiry"}</span>
                <CredentialDate date={latest.expiresOn} />
              </p>
              {inReview ?
                <p>
                  {valid ?
                    "Your current credential still determines which shifts you can claim."
                  : "Claims stay blocked until a credential is approved."}
                </p>
              : latest.status === "rejected" ?
                <p>Check the document and expiry date, then upload a replacement.</p>
              : null}
            </div>
          )}
          <Button
            ref={renewalTrigger}
            variant="outline-primary"
            className="self-start"
            aria-expanded={expanded}
            aria-controls="credential-renewal-form"
            onClick={() => onRenewalOpenChange(!expanded)}
          >
            <HugeiconsIcon icon={FileUploadIcon} aria-hidden="true" />
            {renewalLabel}
          </Button>
          <div id="credential-renewal-form" ref={renewalForm} hidden={!expanded}>
            <CredentialForm
              solid={needsCredential}
              banner={banner}
              onUploaded={(next) => {
                onUploaded(next)
                if (next === undefined) return
                const form = renewalForm.current
                const focused = document.activeElement
                // The disabled submit button can leave focus on the body while the upload finishes.
                if (form !== null && !form.hidden && (form.contains(focused) || focused === document.body)) {
                  renewalTrigger.current?.focus()
                }
                onRenewalOpenChange(false)
              }}
            />
          </div>
        </section>
      </div>
    </section>
  )
}

function CredentialForm({
  solid,
  banner,
  onUploaded,
}: {
  solid: boolean
  banner: Banner
  onUploaded: (next?: CredentialSummary) => void
}) {
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
        (next) => {
          setSubmit(NotAsked())
          setFile(null)
          setAttempt((n) => n + 1)
          reset()
          banner.succeed("Credential submitted for review")
          onUploaded(next)
        }
      )
    })(event)

  return (
    <form noValidate onSubmit={send} className="flex flex-col gap-4" aria-label="Upload a renewal">
      <FileField
        key={attempt}
        look="dropzone"
        fileName={file?.name}
        label="Credential document"
        hint="Demo only. Use a sample file, not a real document."
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
  { value: "advance", label: "Cancelled in advance", hint: "Same as Cancel shift. Reopens it for nurses" },
  { value: "no-show", label: "No-show", hint: "The nurse didn't arrive. Reopens it for nurses" },
] as const satisfies ReadonlyArray<{ value: CancelReason; label: string; hint: string }>

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
  const [openings, setOpenings] = useState(0)
  // While a post is in flight the sheet must stay open, or its unmount would abort the request unreported (FR-11.4).
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>("all")
  const [justPosted, setJustPosted] = useState<string | null>(null)
  useEffect(() => {
    if (justPosted === null) return
    const timer = window.setTimeout(() => setJustPosted(null), NEW_ROW_TINT.asMilliseconds())
    return () => window.clearTimeout(timer)
  }, [justPosted])
  const refreshAll = (): void => {
    shifts.refresh()
    covers.refresh()
  }
  const posted = (shift: Shift): void => {
    setPosting(false)
    setFilter("all")
    setJustPosted(shift.id)
    // A poll that landed while the POST was in flight may already hold it.
    shifts.updateAndRefresh((rows) => (rows.some((row) => row.id === shift.id) ? rows : [...rows, shift]))
    window.requestAnimationFrame(() => {
      const row = document.querySelector(`[data-row="${shift.id}"]`)
      if (row !== null && "scrollIntoView" in row) row.scrollIntoView({ block: "nearest" }) // jsdom has none
    })
    focusLater('[data-testid="agency-post-shift-button"]')
  }
  // FR-6.7 and FR-6.8: one click cancels in advance; the menu beside it records a no-show. No confirmation step.
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
          focusLater(
            `[data-row="${updated.id}"]`,
            '#agency-shifts [aria-label="Filter shifts by status"] input:checked'
          )
          return updated
        }
      )
    })
  const names: ReadonlyMap<string, string> = new Map(
    covers.data instanceof Ready ?
      covers.data.value.map((row) => [coverKey(row.shiftId, row.nurseId), row.nurseName] as const)
    : []
  )
  const own = shifts.data instanceof Ready ? shifts.data.value : []
  return (
    <SectionShell
      user={user}
      title="Shifts"
      polled={shifts}
      toastId={banner.notice?.kind === "success" ? banner.notice.toastId : undefined}
      // While the sheet is open the banner reports inside it, above Post shift (design canvas).
      banner={posting ? null : <BannerSlot notice={banner.notice} />}
      action={
        <Button
          data-testid="agency-post-shift-button"
          aria-haspopup="dialog"
          aria-expanded={posting}
          disabled={sending}
          onClick={() => {
            banner.clear()
            setOpenings((n) => n + 1)
            setPosting(true)
          }}
        >
          <HugeiconsIcon icon={Add01Icon} aria-hidden="true" />
          Post a shift
        </Button>
      }
    >
      <div className={cn(riseIn, pageBody)}>
        <div className="grid gap-4 sm:grid-cols-2">
          <CoverageStat status="open" count={shifts.data instanceof Ready ? openCount(own) : null} />
          <CoverageStat status="filled" count={shifts.data instanceof Ready ? own.length - openCount(own) : null} />
        </div>
        <AgencyShifts
          polled={shifts}
          names={names}
          filter={filter}
          onFilter={setFilter}
          justPosted={justPosted}
          onCancel={cancel}
        />
        <TimesheetTable timesheet={covers} />
      </div>
      <PostShiftSheet
        key={openings}
        open={posting}
        agencyName={user.name}
        own={own}
        banner={banner}
        onClose={() => setPosting(false)}
        onSending={setSending}
        onPosted={posted}
      />
    </SectionShell>
  )
}

type StatusFilter = "all" | "open" | "filled"
const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "filled", label: "Filled" },
] as const satisfies ReadonlyArray<{ value: StatusFilter; label: string }>
const openCount = (rows: ReadonlyArray<{ status: "open" | "filled" }>): number =>
  rows.filter((row) => row.status === "open").length
/** How long a freshly posted row keeps its tint. */
const NEW_ROW_TINT = Duration.seconds(5)

function AgencyShifts({
  polled,
  names,
  filter,
  onFilter,
  justPosted,
  onCancel,
}: {
  polled: Polled<ReadonlyArray<Shift>>
  names: ReadonlyMap<string, string>
  filter: StatusFilter
  onFilter: (filter: StatusFilter) => void
  justPosted: string | null
  onCancel: (shift: Shift, reason: CancelReason) => void
}) {
  const data = polled.data
  const rows = data instanceof Ready ? data.value : []
  const shown = filter === "all" ? rows : rows.filter((shift) => shift.status === filter)
  return (
    <section id="agency-shifts" aria-label="Your agency's shifts" className="flex scroll-mt-17 flex-col gap-3">
      <SectionHead
        id="agency-shifts"
        title="Shifts"
        count={data instanceof Ready ? rows.length : undefined}
        polled={polled}
        tools={
          <SegmentedControl
            label="Filter shifts by status"
            options={STATUS_FILTERS}
            value={filter}
            onChange={onFilter}
          />
        }
      />
      {data instanceof Ready ?
        rows.length === 0 ?
          <StateMessage
            state={{
              kind: "empty",
              title: "No shifts posted yet",
              body: "Post your first shift and nurses can claim it right away.",
            }}
          />
        : shown.length === 0 ?
          <FilterEmpty
            title={`No ${filter} shifts`}
            body="Nothing matches this filter right now."
            onReset={() => onFilter("all")}
          />
        : <ShiftLedger
            rows={shown}
            renderRow={(shift) => {
              const nurse = shift.claimedBy === null ? null : (names.get(coverKey(shift.id, shift.claimedBy)) ?? null)
              return (
                <ShiftRow
                  key={shift.id}
                  shift={shift}
                  data-row={shift.id}
                  data-new={shift.id === justPosted ? "" : undefined}
                  tabIndex={-1}
                  who={
                    shift.claimedBy === null ?
                      <span className="font-medium">No nurse yet</span>
                      // null until the timesheet names a freshly claimed shift; an ID never goes into prose
                    : <span className="truncate text-secondary">
                        {nurse === null ? "Covered by a nurse" : `Covered by ${nurse}`}
                      </span>
                  }
                  note={
                    shift.id === justPosted ?
                      <span className="flex items-center gap-1 type-text-xs text-secondary">
                        <HugeiconsIcon icon={Tick02Icon} className="size-3.5" aria-hidden="true" />
                        Just posted
                      </span>
                    : undefined
                  }
                  actions={shift.claimedBy === null ? null : <CancelWithReason shift={shift} onCancel={onCancel} />}
                />
              )
            }}
          />

      : data instanceof Failed ?
        <LoadFailed title="Couldn't load shifts" retry={polled.refresh} />
      : <StateMessage state={{ kind: "loading", label: "Loading shifts" }} />}
    </section>
  )
}

/**
 * Design AgencyCancelPattern: Cancel shift cancels in advance in one click (FR-6.8's default). The chevron opens the
 * reasons, and each one cancels straight away, so nothing hides in a preselected value.
 */
function CancelWithReason({
  shift,
  onCancel,
}: {
  shift: Shift
  onCancel: (shift: Shift, reason: CancelReason) => void
}) {
  return (
    <>
      <Button
        variant="outline-danger"
        size="sm"
        data-testid="shift-cancel-button"
        aria-label={`Cancel shift: ${shift.role}, ${shift.date}, ${timesLabel(shift)}. Reason, cancelled in advance`}
        // A double click's second press is not a second cancel.
        onClick={(event) => (event.detail > 1 ? undefined : onCancel(shift, "advance"))}
      >
        Cancel shift
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost-primary" size="icon-sm" aria-label="Choose a cancellation reason" />}
        >
          <HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Cancel with a reason</DropdownMenuLabel>
            {CANCEL_REASONS.map((reason) => (
              <DropdownMenuItem
                key={reason.value}
                className="h-auto items-start py-2"
                onClick={() => onCancel(shift, reason.value)}
              >
                <HugeiconsIcon
                  icon={reason.value === "no-show" ? UserRemove01Icon : Calendar03Icon}
                  className="mt-0.5 size-4.5 flex-none"
                  aria-hidden="true"
                />
                <span className="flex flex-col">
                  <span>{reason.label}</span>
                  <span className="type-text-xs text-secondary">{reason.hint}</span>
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

type HourPattern = "day" | "night" | "custom"
const HOUR_PATTERNS = [
  { value: "day", label: "Day", startTime: "07:00", endTime: "19:00", icon: Sun03Icon },
  { value: "night", label: "Night", startTime: "19:00", endTime: "07:00", icon: Moon02Icon },
] as const
type Draft = {
  role: (typeof SHIFT_ROLES)[number]
  date: string
  pattern: HourPattern
  startTime: string
  endTime: string
}
type DraftErrors = { startTime?: string; endTime?: string }
const STRIP_DAYS = 7
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/

/** Typing 0700, 700 or 7 gives 07:00 on blur, and 7:30 gives 07:30. Anything else is kept as typed (design canvas). */
function normaliseTime(typed: string): string {
  const raw = typed.replace(/[^\d:]/g, "")
  if (/^\d{3,4}$/.test(raw)) {
    const padded = raw.padStart(4, "0")
    return `${padded.slice(0, 2)}:${padded.slice(2)}`
  }
  if (/^\d{1,2}$/.test(raw)) return `${raw.padStart(2, "0")}:00`
  if (/^\d:\d\d$/.test(raw)) return `0${raw}`
  return typed
}

/** The times the draft would post, whichever pattern is chosen. */
function draftTimes(draft: Draft): ShiftTimes {
  const pattern = HOUR_PATTERNS.find((one) => one.value === draft.pattern)
  return pattern === undefined ? draft : pattern
}

function draftErrors(draft: Draft): DraftErrors {
  const { startTime, endTime } = draftTimes(draft)
  return {
    ...(HH_MM.test(startTime) ? {} : { startTime: "Enter a start time" }),
    ...(!HH_MM.test(endTime) ? { endTime: "Enter an end time" }
    : startTime === endTime ? { endTime: "Start and end times must differ" }
    : {}),
  }
}

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"] as const
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const

/**
 * Design `.sp-cal`: one month, the picked day in navy, today ringed, past days quiet but still pickable (FR-2.5
 * accepts them). Each day is a button that says its date, so the grid reads as a list of choices.
 */
function MonthPicker({ value, onPick }: { value: string; onPick: (date: string) => void }) {
  const [year = 0, month = 1] = value.split("-").map(Number)
  const [shown, setShown] = useState(() => new DateOnly(year, month, 1))
  const today = facilityToday().pretty()
  const lead = new Date(Date.UTC(shown.year, shown.month - 1, 1)).getUTCDay()
  const length = new Date(Date.UTC(shown.year, shown.month, 0)).getUTCDate()
  const days = Array.from({ length }, (_, offset) => shown.addDays(offset).pretty())
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost-primary"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() => setShown(shown.addMonths(-1))}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" />
        </Button>
        <p className="type-text-sm font-medium tabular-nums" aria-live="polite">
          {`${MONTH_NAMES[shown.month - 1]} ${shown.year}`}
        </p>
        <Button
          variant="ghost-primary"
          size="icon-sm"
          aria-label="Next month"
          onClick={() => setShown(shown.addMonths(1))}
        >
          <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {WEEKDAY_INITIALS.map((initial, column) => (
          <span key={column} aria-hidden="true" className="grid h-7 place-items-center type-text-xs text-secondary">
            {initial}
          </span>
        ))}
        {Array.from({ length: lead }, (_, blank) => (
          <span key={`lead-${blank}`} aria-hidden="true" />
        ))}
        {days.map((date) => {
          const past = date < today
          const isToday = date === today
          const picked = date === value
          return (
            <button
              key={date}
              type="button"
              aria-pressed={picked}
              aria-label={`${date}${isToday ? ", today" : ""}${past ? ", past date" : ""}`}
              onClick={() => onPick(date)}
              className={cn(
                "grid h-9 place-items-center rounded-[calc(var(--outer-radius)-var(--inset))] type-text-sm tabular-nums outline-none",
                "transition-colors duration-(--transition-duration-basic) ease-basic focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
                picked ? "bg-primary-solid font-medium text-on-primary-solid" : "hover:bg-ghost-hover",
                !picked && past && "text-secondary",
                !picked && isToday && "inset-ring inset-ring-strong"
              )}
            >
              {Number(date.slice(8))}
            </button>
          )
        })}
      </div>
    </>
  )
}

/**
 * PostShiftPattern after the design canvas: a sheet with valid defaults (FR-2.10), so two clicks post a shift. Role,
 * day and hours are visible options; the review line follows every change; warnings inform and never block.
 */
function PostShiftSheet({
  open,
  agencyName,
  own,
  banner,
  onClose,
  onSending,
  onPosted,
}: {
  open: boolean
  agencyName: string
  own: ReadonlyArray<Shift>
  banner: Banner
  onClose: () => void
  onSending: (sending: boolean) => void
  onPosted: (shift: Shift) => void
}) {
  // The screen remounts this per opening (its `key`), so each one starts from the defaults; a failed post keeps its
  // values because the sheet stays open.
  const [draft, setDraft] = useState<Draft>(() => ({
    role: "RN",
    date: facilityToday().addDays(1).pretty(),
    pattern: "day",
    startTime: "07:00",
    endTime: "19:00",
  }))
  const [errors, setErrors] = useState<DraftErrors>({})
  const [submit, setSubmit] = useState<RemoteData<FetchError, never>>(NotAsked())
  const cancel = useRef<Cancel>(() => {})
  useEffect(() => () => cancel.current(), [])

  const edit = (next: Partial<Draft>): void => {
    setDraft((prev) => ({ ...prev, ...next }))
    setErrors({})
    if (banner.notice?.kind === "error") banner.clear()
  }
  const times = draftTimes(draft)
  const valid = Object.keys(draftErrors(draft)).length === 0
  const today = facilityToday().pretty()
  const duplicate =
    valid &&
    own.some(
      (shift) =>
        shift.status === "open" &&
        shift.role === draft.role &&
        shift.date === draft.date &&
        shift.startTime === times.startTime &&
        shift.endTime === times.endTime
    )

  const send = (event: FormEvent): void => {
    event.preventDefault()
    if (submit.isLoading) return
    const found = draftErrors(draft)
    setErrors(found)
    if (found.startTime !== undefined || found.endTime !== undefined) {
      focusLater(found.startTime === undefined ? "#post-shift-end" : "#post-shift-start")
      return
    }
    const body: NewShift = { role: draft.role, date: draft.date, ...times }
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
        banner.succeed(`Shift posted: ${shift.role}, ${shift.date}, ${shift.startTime} to ${shift.endTime}`)
        onPosted(shift)
      }
    )
  }

  return (
    <Sheet open={open} onOpenChange={(next) => (next || submit.isLoading ? undefined : onClose())}>
      <SheetContent showCloseButton={false} className="gap-0 overflow-hidden">
        <form
          id="post-shift"
          noValidate
          onSubmit={send}
          aria-label="Post a shift"
          aria-busy={submit.isLoading}
          className="flex min-h-0 flex-1 flex-col"
        >
          <SheetHeader className="flex-row items-start justify-between gap-3 px-5 pt-5 pb-3">
            <div className="flex min-w-0 flex-col">
              <SheetTitle className="type-heading-md">Post a shift</SheetTitle>
              <SheetDescription>{agencyName}</SheetDescription>
            </div>
            <SheetClose
              disabled={submit.isLoading}
              render={<Button variant="ghost-primary" size="icon" aria-label="Close" className="-mt-1 -mr-2" />}
            >
              <HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" />
            </SheetClose>
          </SheetHeader>
          <ScrollArea className="min-h-0 flex-1">
            <fieldset
              disabled={submit.isLoading}
              className="flex flex-col gap-5 px-5 pt-1 pb-5 transition-opacity duration-(--transition-duration-basic) disabled:opacity-60"
            >
              <SheetGroup label="Role">
                <SegmentedControl
                  label="Role"
                  size="lg"
                  block
                  options={SHIFT_ROLES.map((role) => ({ value: role, label: role }))}
                  value={draft.role}
                  onChange={(role) => edit({ role })}
                />
              </SheetGroup>
              <DateStrip value={draft.date} onChange={(date) => edit({ date })} />
              {draft.date < today ?
                <Callout tone="warning" icon={Alert02Icon}>
                  This date has passed. Nurses can still claim it, so check it&apos;s right.
                </Callout>
              : null}
              <HourChoices
                value={draft.pattern}
                onChange={(pattern) =>
                  pattern === "custom" ?
                    // Custom starts from the hours already chosen, so switching never loses them.
                    edit({ pattern, ...draftTimes(draft) })
                  : edit({ pattern })
                }
              />
              {draft.pattern === "custom" ?
                <div className="grid grid-cols-2 gap-3">
                  <TimeField
                    id="post-shift-start"
                    label="Start"
                    value={draft.startTime}
                    error={errors.startTime}
                    onChange={(startTime) => edit({ startTime })}
                  />
                  <TimeField
                    id="post-shift-end"
                    label="End"
                    value={draft.endTime}
                    error={errors.endTime}
                    onChange={(endTime) => edit({ endTime })}
                  />
                </div>
              : null}
              {duplicate ?
                <Callout tone="info" icon={InformationCircleIcon}>
                  {`You already have an open ${draft.role} shift at this time. Post another only if you need a second nurse.`}
                </Callout>
              : null}
            </fieldset>
          </ScrollArea>
          <SheetFooter className="mt-0 gap-3 border-t-[0.5px] border-default px-4 pt-3 pb-4">
            <BannerSlot notice={banner.notice} />
            <ReviewLine draft={draft} />
            <Button
              type="submit"
              size="xl"
              className="w-full"
              loading={submit.isLoading}
              data-testid="agency-post-shift-submit-button"
            >
              Post shift
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/** A labelled block inside the sheet; the label row may carry a link-style action. */
function SheetGroup({
  label,
  labelId,
  aside,
  children,
}: {
  label: string
  labelId?: string
  aside?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span id={labelId} className="type-text-sm font-medium">
          {label}
        </span>
        {aside}
      </div>
      {children}
    </div>
  )
}

const callout = cva("flex items-start gap-2 rounded-xl px-3 py-2.5 type-text-sm", {
  variants: {
    tone: {
      warning: "bg-(--color-background-warning-surface) inset-ring inset-ring-(--color-border-warning-surface)",
      info: "bg-elevated-secondary",
    },
  },
  defaultVariants: { tone: "info" },
})

/** Design `.sp-callout`: informs, never blocks. */
function Callout({
  tone,
  icon,
  children,
}: { icon: IconSvgElement; children: ReactNode } & VariantProps<typeof callout>) {
  return (
    <div role="note" className={callout({ tone })}>
      <HugeiconsIcon icon={icon} className="mt-0.5 size-4 flex-none" aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}

/** Design `.sp-dates`: this week as one-click options, a month grid for anything else. */
function DateStrip({ value, onChange }: { value: string; onChange: (date: string) => void }) {
  const [picking, setPicking] = useState(false)
  const name = useId()
  const today = facilityToday()
  const days = Array.from({ length: STRIP_DAYS }, (_, offset) => today.addDays(offset).pretty())
  const index = days.indexOf(value)
  return (
    <SheetGroup
      label="Date"
      labelId={`${name}-label`}
      aside={
        <Popover open={picking} onOpenChange={setPicking}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-1 rounded-md type-text-sm text-accent outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring"
              />
            }
          >
            <HugeiconsIcon icon={Calendar03Icon} className="size-4" aria-hidden="true" />
            Pick another date
          </PopoverTrigger>
          <PopoverContent
            align="end"
            aria-label="Pick a date"
            // 8px in from a 16px corner, so the 8px day cells stay concentric with the panel.
            className="w-[min(320px,calc(100vw-40px))] gap-1 p-2 [--inset:8px] [--outer-radius:var(--radius-2xl)]"
          >
            <MonthPicker
              value={value}
              onPick={(date) => {
                onChange(date)
                setPicking(false)
              }}
            />
          </PopoverContent>
        </Popover>
      }
    >
      {index === -1 ?
        // A date outside the strip replaces it, so the form never shows two answers.
        <div className="flex items-center gap-3 rounded-xl bg-elevated-secondary px-3 py-2.5">
          <HugeiconsIcon icon={Calendar03Icon} className="size-4.5 text-secondary" aria-hidden="true" />
          <span className="font-medium tabular-nums">{dayLabel(value)}</span>
          <Button variant="ghost-primary" size="sm" className="ml-auto" onClick={() => onChange(days[1] ?? value)}>
            Back to this week
          </Button>
        </div>
      : <div
          role="radiogroup"
          aria-labelledby={`${name}-label`}
          style={{ "--i": index } as CSSProperties}
          className="relative grid grid-cols-7 gap-0.5 rounded-xl bg-(--segmented-control-background) p-0.5"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0.5 left-0.5 w-[calc((100%-4px-12px)/7)] translate-x-[calc((100%+2px)*var(--i))] rounded-[10px] bg-(--segmented-control-thumb-background) shadow-hairline transition-transform duration-(--transition-duration-basic) ease-move motion-reduce:transition-none"
          />
          {days.map((date, offset) => {
            const [weekday] = dayLabel(date).split(" ")
            const rel =
              offset === 0 ? ", today"
              : offset === 1 ? ", tomorrow"
              : ""
            return (
              <label key={date} className="relative flex cursor-pointer">
                <input
                  type="radio"
                  name={name}
                  className="peer absolute inset-0 z-2 size-full cursor-pointer appearance-none opacity-0"
                  aria-label={`${date}, ${weekday}${rel}`}
                  checked={date === value}
                  onChange={() => onChange(date)}
                />
                <span className="relative z-1 flex h-13 w-full flex-col items-center justify-center rounded-[10px] text-secondary transition-colors duration-(--transition-duration-basic) peer-checked:text-primary peer-focus-visible:outline-2 peer-focus-visible:outline-ring">
                  <span className="type-text-xs">{weekday}</span>
                  <b className="text-base leading-5.5 font-medium tabular-nums">{Number(date.slice(8))}</b>
                </span>
              </label>
            )
          })}
        </div>
      }
    </SheetGroup>
  )
}

/** Design `.sp-choices`: Day and Night carry their hours, Custom opens two 24-hour fields. */
function HourChoices({ value, onChange }: { value: HourPattern; onChange: (pattern: HourPattern) => void }) {
  const name = useId()
  const choices: ReadonlyArray<{
    value: HourPattern
    label: string
    meta: string
    tail?: string
    icon: IconSvgElement
  }> = [
    ...HOUR_PATTERNS.map((one) => ({
      value: one.value,
      label: one.label,
      meta: timesLabel(one),
      tail: `${hoursOf(one)} h`,
      icon: one.icon,
    })),
    { value: "custom", label: "Custom", meta: "Set your own hours", icon: Clock03Icon },
  ]
  return (
    <div role="radiogroup" aria-label="Hours" className="flex flex-col gap-2">
      <span className="type-text-sm font-medium" aria-hidden="true">
        Hours
      </span>
      <div className="flex flex-col gap-1">
        {choices.map((choice) => (
          <label key={choice.value} className="relative flex cursor-pointer">
            <input
              type="radio"
              name={name}
              className="peer absolute inset-0 z-2 size-full cursor-pointer appearance-none opacity-0"
              checked={choice.value === value}
              onChange={() => onChange(choice.value)}
            />
            <span
              className={cn(
                "flex h-14 w-full items-center gap-3 rounded-xl px-3.5 transition-[background-color,box-shadow] duration-(--transition-duration-basic) ease-move",
                "peer-checked:bg-elevated-secondary peer-checked:inset-ring peer-checked:inset-ring-(--color-border) hover:bg-(--color-background-primary-ghost-hover)",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-ring",
                "peer-checked:[&>[data-dot]]:inset-ring-[5px] peer-checked:[&>[data-dot]]:inset-ring-primary-solid"
              )}
            >
              <HugeiconsIcon icon={choice.icon} className="size-4.5 flex-none text-secondary" aria-hidden="true" />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-medium">{choice.label}</span>
                <span className="type-text-xs text-secondary tabular-nums">{choice.meta}</span>
              </span>
              {choice.tail === undefined ? null : (
                <span className="type-text-xs text-secondary tabular-nums">{choice.tail}</span>
              )}
              <span
                data-dot
                aria-hidden="true"
                className="size-4 flex-none rounded-full bg-control inset-ring inset-ring-strong transition-shadow duration-(--transition-duration-basic)"
              />
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

/** A 24-hour text field: numeric keyboard on a phone, normalised on blur, its error right beneath it. */
function TimeField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  value: string
  error: string | undefined
  onChange: (value: string) => void
}) {
  return (
    <div className={fieldFrame}>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder="HH:mm"
        maxLength={5}
        autoComplete="off"
        className="tabular-nums"
        value={value}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={error === undefined ? undefined : `${id}-message`}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          const next = normaliseTime(event.target.value)
          if (next !== event.target.value) onChange(next)
        }}
      />
      {error === undefined ? null : (
        <p id={`${id}-message`} className={fieldMessage} data-error>
          <AlertCircleIcon className="mt-px size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

/** Design `.sp-summary`: what Post shift will send, in words, updated on every change. */
function ReviewLine({ draft }: { draft: Draft }) {
  const times = draftTimes(draft)
  const valid = Object.keys(draftErrors(draft)).length === 0
  return (
    <div aria-live="polite" className="flex items-center gap-3 rounded-xl bg-elevated-secondary px-3 py-2.5">
      <HugeiconsIcon
        icon={valid && overnight(times) ? Moon02Icon : Sun03Icon}
        className="size-4.5 flex-none text-secondary"
        aria-hidden="true"
      />
      <div className="flex min-w-0 flex-col">
        <span className="font-medium tabular-nums">{`${draft.role}, ${dayLabel(draft.date)}`}</span>
        <span className="type-text-sm text-secondary tabular-nums">
          {valid ?
            `${timesLabel(times)}, ${hoursOf(times).toLocaleString()} scheduled hours`
          : "Set a start and end time"}
        </span>
      </div>
    </div>
  )
}

// ─── Admin ─────────────────────────────────────────────────────────────────────────────────────────────────────

const loadAdminShifts = (): Future<FetchError, ReadonlyArray<AdminShift>> =>
  call(api.adminShifts, {}).map(({ shifts }) => shifts)
const loadAuditLog = (): Future<FetchError, ReadonlyArray<AuditEntry>> =>
  call(api.auditLog, {}).map(({ entries }) => entries)

/** FR-1.11: coverage, scheduled hours and the audit log on one screen. Each section polls on its own (FR-5.4). */
function AdminScreen({ user }: { user: User }) {
  const shifts = usePoll(loadAdminShifts, [user.id.value])
  return (
    <SectionShell user={user} title="Coverage" banner={null} polled={shifts}>
      <div className={cn(riseIn, pageBody)}>
        <CoverageSection shifts={shifts} />
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
function CoverageSection({ shifts }: { shifts: Polled<ReadonlyArray<AdminShift>> }) {
  const [sort, setSort] = useState<SortState>({ sorting: "increasing", column: "date" })
  const [filter, setFilter] = useState<StatusFilter>("all")
  const data = shifts.data
  const all = data instanceof Ready ? data.value : null
  const rows =
    all === null ?
      []
    : [...all].filter((x) => filter === "all" || x.status === filter).sort(comparator(COVERAGE_COLUMNS, sort))
  const count = (status: "open" | "filled") => (all === null ? null : all.filter((x) => x.status === status).length)
  const emptyMessage =
    data instanceof Failed ? <LoadFailed title="Couldn't load shifts" retry={shifts.refresh} />
    : data instanceof Ready ?
      all !== null && all.length > 0 ?
        <>
          <p className="type-text-sm text-primary">{`No ${filter} shifts`}</p>
          <Button variant="ghost-primary" size="sm" className="mt-2" onClick={() => setFilter("all")}>
            Show all shifts
          </Button>
        </>
      : <>
          <p className="type-text-sm text-primary">No shifts yet</p>
          <p className="mt-1 type-text-sm text-secondary">Coverage appears here as agencies post them.</p>
        </>
    : <span className={cn("shiftpatch-page-shimmer", "type-text-sm")}>Loading shifts</span>
  return (
    <section id="coverage" aria-labelledby="coverage-title" className="flex scroll-mt-17 flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <CoverageStat status="open" count={count("open")} />
        <CoverageStat status="filled" count={count("filled")} />
      </div>
      <SectionHead
        id="coverage"
        title="Shift coverage"
        polled={shifts}
        tools={
          <SegmentedControl
            label="Filter coverage by status"
            options={STATUS_FILTERS}
            value={filter}
            onChange={setFilter}
          />
        }
      />
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

type AuditKind = "shift" | "cancel" | "credential" | "blocked" | "other"
type AuditFilter = "all" | "shift" | "credential" | "blocked"
const AUDIT_FILTERS = [
  { value: "all", label: "All" },
  { value: "shift", label: "Shifts" },
  { value: "credential", label: "Credentials" },
  { value: "blocked", label: "Blocked" },
] as const satisfies ReadonlyArray<{ value: AuditFilter; label: string }>
const AUDIT_ICON: Record<AuditKind, IconSvgElement> = {
  shift: Calendar03Icon,
  cancel: UserRemove01Icon,
  credential: LicenseIcon,
  blocked: UnavailableIcon,
  other: Activity01Icon,
}

/** The audit row's family, for its icon and the filter. The server sends the action as a string. */
function auditKind(action: string): AuditKind {
  if (action === "shift.cancelled") return "cancel"
  if (action === "claim.blocked") return "blocked"
  if (action.startsWith("shift.")) return "shift"
  if (action.startsWith("credential.")) return "credential"
  return "other"
}

const inAuditFilter = (filter: AuditFilter, kind: AuditKind): boolean =>
  filter === "all" || kind === filter || (filter === "shift" && kind === "cancel")

/** FR-8.1 and FR-6.6: read-only, newest first. Reason and previous nurse are set by cancellations, otherwise a dash. */
function AuditSection({ user }: { user: User }) {
  const log = usePoll(loadAuditLog, [user.id.value])
  const [sort, setSort] = useState<SortState>({ sorting: "decreasing", column: "time" })
  const [filter, setFilter] = useState<AuditFilter>("all")
  const data = log.data
  const rows =
    data instanceof Ready ?
      [...data.value].filter((e) => inAuditFilter(filter, auditKind(e.action))).sort(comparator(AUDIT_COLUMNS, sort))
    : []
  const emptyMessage =
    data instanceof Failed ? <LoadFailed title="Couldn't load the audit log" retry={log.refresh} />
    : data instanceof Ready ?
      data.value.length > 0 ?
        <>
          <p className="type-text-sm text-primary">No entries match this filter</p>
          <Button variant="ghost-primary" size="sm" className="mt-2" onClick={() => setFilter("all")}>
            Show all entries
          </Button>
        </>
      : <>
          <p className="type-text-sm text-primary">No activity yet</p>
          <p className="mt-1 type-text-sm text-secondary">Posts, claims, cancellations and reviews appear here.</p>
        </>
    : <span className={cn("shiftpatch-page-shimmer", "type-text-sm")}>Loading the audit log</span>
  return (
    <section id="audit" aria-labelledby="audit-title" className="flex scroll-mt-17 flex-col gap-3">
      <SectionHead
        id="audit"
        title="Audit log"
        hint="Newest first. Entries can't be edited or deleted."
        polled={log}
        tools={
          <SegmentedControl label="Filter audit log" options={AUDIT_FILTERS} value={filter} onChange={setFilter} />
        }
      />
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
            action: (
              <span className="inline-flex items-center gap-1.5">
                <HugeiconsIcon
                  icon={AUDIT_ICON[auditKind(e.action)]}
                  className="size-4 flex-none text-secondary"
                  aria-hidden="true"
                />
                <span className="font-mono">{e.action}</span>
              </span>
            ),
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
