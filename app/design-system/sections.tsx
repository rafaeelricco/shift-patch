import Image from "next/image"
import { type CSSProperties, type ReactNode } from "react"

import { BannerDemo } from "@/app/design-system/banner-demo"
import { Button } from "@/components/ui/button"
import { type Column, DataTable } from "@/components/ui/data-table"
import { FileField, SelectField, TextField } from "@/components/ui/field"
import { NotificationBanner } from "@/components/ui/notification-banner"
import { ShiftCard, type ShiftSummary } from "@/components/ui/shift-card"
import { StateMessage } from "@/components/ui/state-message"
import { type Status, StatusBadge } from "@/components/ui/status-badge"

const SECTIONS = [
  { id: "brand", label: "Brand" },
  { id: "colour", label: "Colour" },
  { id: "type", label: "Type" },
  { id: "layout", label: "Layout" },
  { id: "components", label: "Components" },
  { id: "patterns", label: "Patterns" },
  { id: "left-out", label: "Left out" },
] as const

type SectionId = (typeof SECTIONS)[number]["id"]

const SUNRISE = "Sunrise Health Staffing"
const METRO = "Metro Care Partners"

type SeedShift = ShiftSummary & { id: string; nurse: string | null }

const SEED_SHIFTS: ReadonlyArray<SeedShift> = [
  {
    id: "shift-1",
    agencyName: SUNRISE,
    role: "RN",
    date: "2026-10-02",
    startTime: "19:00",
    endTime: "07:00",
    status: "open",
    nurse: null,
  },
  {
    id: "shift-2",
    agencyName: SUNRISE,
    role: "LPN",
    date: "2026-10-03",
    startTime: "07:00",
    endTime: "19:00",
    status: "filled",
    nurse: "Maria Lopez",
  },
  {
    id: "shift-3",
    agencyName: METRO,
    role: "RN",
    date: "2026-10-04",
    startTime: "19:00",
    endTime: "07:00",
    status: "open",
    nurse: null,
  },
]

const [SHIFT_1, SHIFT_2, SHIFT_3] = SEED_SHIFTS as readonly [SeedShift, SeedShift, SeedShift]

function Section({ id, title, lede, children }: { id: SectionId; title: string; lede: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mt-14 scroll-mt-6">
      <h2 id={`${id}-title`} className="type-heading-lg">
        {title}
      </h2>
      <p className="mt-1 max-w-[62ch] type-text-sm text-secondary">{lede}</p>
      <div className="mt-6 flex flex-col gap-6">{children}</div>
    </section>
  )
}

function Specimen({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl p-5 shadow-hairline md:p-6">
      <h3 className="type-heading-xs">{title}</h3>
      {note && <p className="mt-1 max-w-[62ch] type-text-sm text-secondary">{note}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

function Label({ children }: { children: ReactNode }) {
  return <p className="mb-3 type-small-caps-md text-secondary">{children}</p>
}

function Token({ children }: { children: string }) {
  return <code className="font-mono text-xs [overflow-wrap:anywhere] text-secondary">{children}</code>
}

export function PageHeader() {
  return (
    <header>
      <div className="flex items-center gap-2">
        <Image className="h-7 w-auto" src="/brand/mark.svg" alt="" width={750} height={801} />
        <p className="type-small-caps-md text-secondary">ShiftPatch · Design system</p>
      </div>
      <h1 className="mt-8 type-heading-xl">Every shift, covered and accounted for.</h1>
      <p className="mt-3 max-w-[60ch] type-text-lg text-secondary">
        Near-monochrome ink on a quiet ground. Navy is the action, and every other colour reports a shift or a
        credential. The values live in <code className="font-mono text-base">app/globals.css</code>.
      </p>
      <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-x-4 gap-y-1 border-b border-subtle pb-6">
        {SECTIONS.map(({ id, label }) => (
          <a key={id} href={`#${id}`} className="type-text-sm text-accent underline-offset-2 hover:underline">
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}

const PRINCIPLES = [
  {
    title: "The action is navy",
    body: "One solid action per view: Claim shift, Post a shift, Sign in. The label is always white.",
  },
  {
    title: "Colour reports status",
    body: "Open, filled, valid, expired, pending. Everything that is not a status stays ink, and the word always sits beside the colour.",
  },
  {
    title: "Coverage reads at a glance",
    body: "An administrator scans who covers what. Figures line up in columns, and a missing nurse is a dash, never a blank.",
  },
  {
    title: "Blocked is explained",
    body: "A nurse with a lapsed credential can still press Claim shift. The banner says why it failed, so nothing is quietly hidden.",
  },
] as const

const VOICE = [
  { when: "Claim succeeds", say: "Shift claimed" },
  { when: "Credential lapsed", say: "Credential expired, cannot claim shift" },
  { when: "Sign-in fails", say: "Invalid email or password" },
  { when: "Timesheet column", say: "Scheduled hours" },
] as const

export function BrandSection() {
  return (
    <Section
      id="brand"
      title="Brand"
      lede="ShiftPatch is a fictional, neutral brand for nursing shift coverage. Plain words for people working to a short deadline."
    >
      <Specimen title="Principles">
        <div className="grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map(({ title, body }) => (
            <div key={title} className="surface-card p-4">
              <h4 className="type-heading-xs">{title}</h4>
              <p className="mt-1 type-text-sm text-secondary">{body}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Logo" note="The calendar mark and wordmark.">
        <div className="flex flex-wrap items-center gap-x-12 gap-y-6">
          <Logo src="/brand/lockup-horizontal.svg" w={3051} h={1016} cls="h-14" alt="ShiftPatch" />
          <Logo src="/brand/wordmark.svg" w={1158} h={198} cls="h-5" alt="ShiftPatch wordmark" />
          <Logo src="/brand/mark.svg" w={750} h={801} cls="h-8" alt="ShiftPatch mark" />
        </div>
      </Specimen>
      <Specimen
        title="Voice"
        note="Say what happened in as few words as it takes. Status words stay exactly as the API sends them."
      >
        <dl className="grid gap-x-6 gap-y-2 md:grid-cols-[180px_1fr]">
          {VOICE.map(({ when, say }) => (
            <div key={when} className="contents">
              <dt className="type-text-sm text-secondary">{when}</dt>
              <dd className="type-text-sm font-medium">{say}</dd>
            </div>
          ))}
        </dl>
      </Specimen>
    </Section>
  )
}

function Logo({ src, w, h, cls, alt }: { src: string; w: number; h: number; cls: string; alt: string }) {
  return <Image className={`${cls} w-auto`} src={src} alt={alt} width={w} height={h} />
}

type SwatchSpec = { name: string; token: string; value: string; use: string }

const SURFACES: ReadonlyArray<SwatchSpec> = [
  { name: "Surface", token: "--color-surface", value: "#fcfcfc", use: "Every screen" },
  { name: "Card", token: "--color-surface-card", value: "#ffffff", use: "Shift cards, tables" },
  {
    name: "Control",
    token: "--color-background-control-opaque",
    value: "#ffffff",
    use: "Inputs, selects",
  },
  { name: "Tertiary", token: "--color-surface-tertiary", value: "#f9f9f9", use: "Wells behind panes" },
]

const ACTION: ReadonlyArray<SwatchSpec> = [
  {
    name: "Action",
    token: "--color-background-primary-solid",
    value: "#0a2646",
    use: "Claim, Post, Sign in",
  },
  {
    name: "Hover",
    token: "--color-background-primary-solid-hover",
    value: "#1b3a5e",
    use: "Pointer over it",
  },
  {
    name: "Pressed",
    token: "--color-background-primary-solid-active",
    value: "#2b4a6f",
    use: "While pressed",
  },
  { name: "Label", token: "--color-text-primary-solid", value: "#ffffff", use: "On the action" },
]

const TEXT: ReadonlyArray<SwatchSpec> = [
  { name: "Primary", token: "--color-text-primary", value: "#0d0d0d", use: "Body and titles" },
  {
    name: "Secondary",
    token: "--color-text-secondary",
    value: "#5d5d5d",
    use: "Anything a user must read",
  },
  { name: "Tertiary", token: "--color-text-tertiary", value: "#8f8f8f", use: "Placeholders only" },
  { name: "Link", token: "--app-color-text-accent", value: "#2c67c5", use: "Links and references" },
]

const BORDERS: ReadonlyArray<SwatchSpec> = [
  { name: "Subtle", token: "--color-border-subtle", value: "#0000000d", use: "Table rows" },
  { name: "Default", token: "--color-border", value: "#0000001a", use: "Cards, dividers" },
  {
    name: "Strong",
    token: "--color-border-strong",
    value: "#00000026",
    use: "Inputs, outline buttons",
  },
  { name: "Focus", token: "--color-ring", value: "#3a83f7", use: "Keyboard focus ring" },
]

function SwatchGrid({ swatches }: { swatches: ReadonlyArray<SwatchSpec> }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {swatches.map(({ name, token, value, use }) => (
        <div key={token}>
          <div className="h-16 rounded-xl shadow-hairline" style={{ background: `var(${token})` }} aria-hidden="true" />
          <p className="mt-2 type-heading-xs">{name}</p>
          <p className="type-text-sm text-secondary">{use}</p>
          <Token>{token}</Token>
          <p className="font-mono text-xs text-secondary">{value}</p>
        </div>
      ))}
    </div>
  )
}

const INTENTS: ReadonlyArray<{ intent: string; means: string; statuses: ReadonlyArray<Status> }> = [
  { intent: "Info", means: "A shift still needs covering.", statuses: ["open"] },
  { intent: "Success", means: "Covered, and credentials are good.", statuses: ["filled", "valid", "approved"] },
  { intent: "Warning", means: "Waiting on an admin.", statuses: ["pending"] },
  { intent: "Danger", means: "A nurse cannot claim, or an upload failed review.", statuses: ["expired", "rejected"] },
]

export function ColourSection() {
  return (
    <Section
      id="colour"
      title="Colour"
      lede="Use the semantic tokens, never raw hex. Blue is for focus, links and the open status, and is never the action."
    >
      <Specimen
        title="Surfaces"
        note="The ground is off-white. Anything you type into or that floats is pure white, lifted by shadow."
      >
        <SwatchGrid swatches={SURFACES} />
      </Specimen>
      <Specimen title="Action" note="From the calendar in the logo.">
        <SwatchGrid swatches={ACTION} />
      </Specimen>
      <Specimen title="Status" note="Four of the system's intents are in use. Caution and discovery have no job here.">
        <div className="grid gap-4 md:grid-cols-2">
          {INTENTS.map(({ intent, means, statuses }) => (
            <div key={intent} className="surface-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="mr-1 type-heading-xs">{intent}</h4>
                {statuses.map((status) => (
                  <StatusBadge key={status} status={status} />
                ))}
              </div>
              <p className="mt-2 type-text-sm text-secondary">{means}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Text" note="Tertiary is about 3.2:1 on white, so it never carries anything a user has to read.">
        <SwatchGrid swatches={TEXT} />
      </Specimen>
      <Specimen title="Borders and focus" note="Ink at 5, 10 and 15 percent. Half-pixel hairlines are a signature.">
        <SwatchGrid swatches={BORDERS} />
      </Specimen>
    </Section>
  )
}

const TYPE_STEPS = [
  {
    cls: "type-heading-xl",
    name: "heading-xl",
    spec: "32/38 · 600",
    sample: "Every shift, covered",
    job: "This page's title",
  },
  { cls: "type-heading-lg", name: "heading-lg", spec: "24/28 · 600", sample: "Open shifts", job: "Section titles" },
  { cls: "type-heading-md", name: "heading-md", spec: "20/26 · 600", sample: "Post a shift", job: "Panel titles" },
  { cls: "type-heading-xs", name: "heading-xs", spec: "16/24 · 600", sample: "RN shift", job: "Card and form titles" },
  {
    cls: "type-text-md",
    name: "text-md",
    spec: "16/24 · 400",
    sample: "Maria Lopez is covering this shift.",
    job: "Content",
  },
  {
    cls: "type-text-sm",
    name: "text-sm",
    spec: "14/20 · 400",
    sample: "Sunrise Health Staffing",
    job: "Tables, labels, buttons",
  },
  {
    cls: "type-text-xs",
    name: "text-xs",
    spec: "12/18 · 400",
    sample: "PDF, PNG or JPEG, up to 4 MB",
    job: "Helper text",
  },
  { cls: "type-small-caps-md", name: "small-caps-md", spec: "11/15 · 600", sample: "Credential", job: "Small labels" },
] as const

export function TypeSection() {
  return (
    <Section
      id="type"
      title="Type"
      lede="The system face on every device, with no web fonts. 16px for content and 14px for chrome. Headings at 600, nothing relies on bold."
    >
      <Specimen title="Family">
        <p className="type-heading-md">System UI</p>
        <Token>--font-sans</Token>
        <p className="mt-4 font-mono text-sm">2026-10-02 19:00 to 07:00</p>
        <Token>--font-mono</Token>
      </Specimen>
      <Specimen title="Scale" note="The steps ShiftPatch uses, and the job each one does.">
        <ul className="flex flex-col">
          {TYPE_STEPS.map(({ cls, name, spec, sample, job }) => (
            <li
              key={name}
              className="grid gap-x-6 gap-y-1 border-b border-subtle py-3 last:border-b-0 md:grid-cols-[180px_1fr]"
            >
              <div>
                <p className="type-text-sm font-medium">{name}</p>
                <p className="type-text-xs text-secondary">
                  {spec} · {job}
                </p>
              </div>
              <p className={cls}>{sample}</p>
            </li>
          ))}
        </ul>
      </Specimen>
    </Section>
  )
}

const SPACING = [4, 8, 12, 16, 20, 24, 32] as const

const RADII = [
  { token: "--radius-sm", px: "4", use: "File button" },
  { token: "--radius-lg", px: "8", use: "Inputs" },
  { token: "--radius-xl", px: "12", use: "Banners, swatches" },
  { token: "--radius-2xl", px: "16", use: "Cards, tables" },
  { token: "--radius-3xl", px: "24", use: "Large frames" },
  { token: "--radius-full", px: "9999", use: "Buttons, badges" },
] as const

const DEPTHS = [
  { name: "Flat", cls: "", note: "Ground, quiet rows" },
  { name: "Hairline", cls: "shadow-hairline", note: "Tables, specimen frames" },
  { name: "Card", cls: "surface-card", note: "Shift cards, lifted by a hairline and a soft shadow" },
] as const

const MOTION = [
  {
    name: "Basic",
    duration: "var(--transition-duration-basic)",
    curve: "var(--ease-basic)",
    spec: "150ms",
    use: "Colour, opacity",
  },
  {
    name: "Press",
    duration: "80ms",
    curve: "var(--ease-enter-snappy)",
    spec: "80ms",
    use: "The button fill shrinking",
  },
  {
    name: "Relaxed, enter",
    duration: "var(--transition-duration-relaxed)",
    curve: "var(--cubic-enter)",
    spec: "300ms",
    use: "The banner arriving",
  },
] as const

export function LayoutSection() {
  return (
    <Section
      id="layout"
      title="Layout"
      lede="A 4px base, soft corners and very quiet depth. Each role gets one landing screen, so there is no app shell to design around."
    >
      <Specimen title="Spacing">
        <ul className="flex flex-col gap-2">
          {SPACING.map((px) => (
            <li key={px} className="flex items-center gap-3">
              <span className="w-8 text-right text-sm text-secondary tabular-nums">{px}</span>
              <span className="h-3 rounded-xs bg-primary-solid" style={{ width: px }} aria-hidden="true" />
            </li>
          ))}
        </ul>
      </Specimen>
      <Specimen
        title="Corners"
        note="Tight nesting uses the outer radius minus the gap. Once the gap reaches about three quarters of the outer radius, each layer is sized on its own, and an inner radius is never larger than its parent's."
      >
        <div className="grid grid-cols-2 items-end gap-4 md:grid-cols-6">
          {RADII.map(({ token, px, use }) => (
            <div key={token}>
              <div
                className={`${token === "--radius-full" ? "h-8" : "h-16"} bg-elevated-secondary shadow-hairline`}
                style={{ borderRadius: `var(${token})` }}
                aria-hidden="true"
              />
              <p className="mt-2 type-text-sm font-medium">{px}</p>
              <p className="type-text-xs text-secondary">{use}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Elevation">
        <div className="grid gap-4 md:grid-cols-3">
          {DEPTHS.map(({ name, cls, note }) => (
            <div key={name} className={`rounded-2xl p-4 ${cls}`}>
              <p className="type-heading-xs">{name}</p>
              <p className="type-text-sm text-secondary">{note}</p>
            </div>
          ))}
        </div>
      </Specimen>
      <Specimen title="Motion" note="Quick and purposeful. With reduced motion on, movement stops and fades stay.">
        <input id="motion-toggle" type="checkbox" className="motion-toggle peer sr-only" />
        <label
          htmlFor="motion-toggle"
          className="btn btn-outline-primary btn-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-1 peer-focus-visible:outline-ring"
        >
          <span>Move the dots</span>
        </label>
        <ul className="mt-4 flex flex-col gap-4">
          {MOTION.map(({ name, duration, curve, spec, use }) => (
            <li key={name} className="grid items-center gap-x-6 gap-y-2 md:grid-cols-[220px_1fr]">
              <div>
                <p className="type-text-sm font-medium">
                  {name} · {spec}
                </p>
                <p className="type-text-xs text-secondary">{use}</p>
              </div>
              <div className="max-w-[180px]">
                <div
                  className="motion-dot"
                  style={{ "--motion-duration": duration, "--motion-curve": curve } as CSSProperties}
                />
              </div>
            </li>
          ))}
        </ul>
      </Specimen>
    </Section>
  )
}

const ALL_STATUSES: ReadonlyArray<Status> = ["open", "filled", "valid", "expired", "pending", "approved", "rejected"]

export function ComponentsSection() {
  return (
    <Section
      id="components"
      title="Components"
      lede="Only what the shift, credential, timesheet and audit screens need. These are the components the product screens import."
    >
      <Specimen
        title="Button"
        note="One solid action per view. Danger is for the actions that take something away from someone."
      >
        <Label>Variants</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button>Claim shift</Button>
          <Button variant="outline-primary">Sign out</Button>
          <Button variant="ghost-primary">Open document</Button>
          <Button variant="outline-danger">Cancel shift</Button>
          <Button variant="solid-danger">Reset demo</Button>
        </div>
        <Label>
          <span className="mt-6 block">Sizes</span>
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm">Approve</Button>
          <Button>Post a shift</Button>
          <Button size="xl">Sign in</Button>
        </div>
        <Label>
          <span className="mt-6 block">States</span>
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled>Disabled</Button>
          <Button loading>Claim shift</Button>
        </div>
        <p className="mt-2 type-text-sm text-secondary">
          Claim shift is never disabled for a lapsed credential. Pressing it is how the nurse learns why.
        </p>
      </Specimen>

      <Specimen
        title="Fields"
        note="Date and time use the browser's own pickers. Errors pair red with an icon and a sentence."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Email" type="email" placeholder="maria.lopez@example.com" autoComplete="off" />
          <TextField
            label="Email"
            type="email"
            defaultValue="maria"
            error="Enter a valid email address."
            autoComplete="off"
          />
          <SelectField label="Role" defaultValue="RN">
            <option value="RN">RN</option>
            <option value="LPN">LPN</option>
          </SelectField>
          <TextField label="Date" type="date" defaultValue="2026-10-05" />
          <TextField label="Start time" type="time" defaultValue="07:00" hint="24-hour, facility-local time." />
          <FileField label="Credential document" hint="PDF, PNG or JPEG, up to 4 MB." accept=".pdf,.png,.jpg,.jpeg" />
          <TextField label="Disabled" defaultValue="Sunrise Health Staffing" disabled />
        </div>
      </Specimen>

      <Specimen
        title="Status badge"
        note="Shows the literal status. A cancelled shift reopens, so it reads open: there is no cancelled badge."
      >
        <div className="flex flex-wrap gap-2">
          {ALL_STATUSES.map((status) => (
            <StatusBadge key={status} status={status} />
          ))}
        </div>
      </Specimen>

      <Specimen title="Notification banner" note="One banner for every outcome, told apart by its words. Try both.">
        <BannerDemo />
      </Specimen>

      <Specimen title="Shift card" note="One per shift in the nurse and agency lists.">
        <div className="flex flex-col gap-3">
          <ShiftCard shift={SHIFT_1} action={<Button>Claim shift</Button>} />
          <ShiftCard
            shift={SHIFT_2}
            detail="Covered by Maria Lopez"
            action={<Button variant="outline-danger">Cancel shift</Button>}
          />
        </div>
      </Specimen>

      <Specimen
        title="Data table"
        note="Figures align right in tabular numerals. Identifiers stay left. A missing value is a dash, never a zero."
      >
        <ShiftTable />
      </Specimen>

      <Specimen title="Loading, empty and error" note="Every screen has all three.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl shadow-hairline">
            <StateMessage state={{ kind: "loading", label: "Loading shifts" }} />
          </div>
          <div className="rounded-2xl shadow-hairline">
            <StateMessage
              state={{
                kind: "empty",
                title: "No open shifts right now",
                body: "New shifts appear here as agencies post them.",
              }}
            />
          </div>
          <div className="md:col-span-2">
            <StateMessage
              state={{
                kind: "error",
                title: "Couldn't load shifts",
                body: "Check your connection, then try again.",
                action: <Button variant="outline-primary">Try again</Button>,
              }}
            />
          </div>
        </div>
      </Specimen>
    </Section>
  )
}

const SHIFT_COLUMNS: ReadonlyArray<Column<SeedShift>> = [
  { key: "agency", label: "Agency", cell: (s) => s.agencyName },
  { key: "role", label: "Role", cell: (s) => s.role },
  { key: "date", label: "Date", cell: (s) => <span className="tabular-nums">{s.date}</span> },
  {
    key: "times",
    label: "Times",
    cell: (s) => (
      <span className="tabular-nums">
        {s.startTime} to {s.endTime}
      </span>
    ),
  },
  { key: "nurse", label: "Covering nurse", cell: (s) => s.nurse ?? "—" },
  { key: "status", label: "Status", cell: (s) => <StatusBadge status={s.status} /> },
]

function ShiftTable() {
  return <DataTable caption="All shifts" columns={SHIFT_COLUMNS} rows={SEED_SHIFTS} rowKey={(s) => s.id} />
}

type TimesheetRow = { id: string; nurse: string; agency: string; date: string; times: string; hours: number }

const TIMESHEET_COLUMNS: ReadonlyArray<Column<TimesheetRow>> = [
  { key: "nurse", label: "Nurse", cell: (r) => r.nurse },
  { key: "agency", label: "Agency", cell: (r) => r.agency },
  { key: "date", label: "Date", cell: (r) => <span className="tabular-nums">{r.date}</span> },
  { key: "times", label: "Times", cell: (r) => <span className="tabular-nums">{r.times}</span> },
  { key: "hours", label: "Scheduled hours", align: "right", cell: (r) => r.hours.toLocaleString() },
]

const TIMESHEET_ROWS: ReadonlyArray<TimesheetRow> = [
  { id: "shift-2", nurse: "Maria Lopez", agency: SUNRISE, date: "2026-10-03", times: "07:00 to 19:00", hours: 12 },
]

type AuditRow = { id: string; time: string; actor: string; action: string; record: string; reason: string }

const AUDIT_COLUMNS: ReadonlyArray<Column<AuditRow>> = [
  { key: "time", label: "Time", cell: (r) => <span className="tabular-nums">{r.time}</span> },
  { key: "actor", label: "Actor", cell: (r) => r.actor },
  { key: "action", label: "Action", cell: (r) => r.action },
  { key: "record", label: "Record", cell: (r) => r.record },
  { key: "reason", label: "Reason", cell: (r) => r.reason },
]

const AUDIT_ROWS: ReadonlyArray<AuditRow> = [
  {
    id: "a3",
    time: "2026-10-03 06:12",
    actor: SUNRISE,
    action: "Cancelled shift",
    record: "shift-2",
    reason: "no-show",
  },
  { id: "a2", time: "2026-10-01 14:40", actor: "James Cook", action: "Blocked claim", record: "shift-1", reason: "—" },
  { id: "a1", time: "2026-10-01 09:05", actor: "Maria Lopez", action: "Claimed shift", record: "shift-2", reason: "—" },
]

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-4">
      <p className="type-text-sm text-secondary">{label}</p>
      <p className="type-heading-xl tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

export function PatternsSection() {
  return (
    <Section
      id="patterns"
      title="Patterns"
      lede="How the pieces combine on each role's one landing screen, using the seeded sample data. The audit rows are illustrative."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Specimen title="Sign in" note="What a visitor with no session sees first.">
          <div className="flex flex-col gap-4">
            <TextField label="Email" type="email" placeholder="alex.kim@example.com" autoComplete="off" />
            <TextField label="Password" type="password" autoComplete="off" />
            <NotificationBanner notice={{ kind: "error", message: "Invalid email or password" }} />
            <Button size="xl" className="w-full">
              Sign in
            </Button>
          </div>
        </Specimen>

        <Specimen
          title="Agency: post a shift"
          note="Opens inline with valid defaults, so it can be submitted unchanged."
        >
          <div className="flex flex-col gap-4">
            <SelectField label="Role" defaultValue="RN">
              <option value="RN">RN</option>
              <option value="LPN">LPN</option>
            </SelectField>
            <TextField label="Date" type="date" defaultValue="2026-10-05" />
            <div className="grid grid-cols-2 gap-4">
              <TextField label="Start" type="time" defaultValue="07:00" />
              <TextField label="End" type="time" defaultValue="19:00" hint="Earlier than start means overnight." />
            </div>
            <Button className="w-full">Post shift</Button>
          </div>
        </Specimen>
      </div>

      <Specimen
        title="Nurse: credential"
        note="An upload stays pending until an admin approves it, and doesn't change eligibility until then."
      >
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <FileField
              label="License document"
              hint="Demo only: don't upload real documents. PDF, PNG or JPEG, up to 4 MB."
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <TextField label="Expiry date" type="date" defaultValue="2027-06-01" />
            <Button className="self-start">Submit for review</Button>
          </div>
          <dl className="flex flex-col gap-3">
            <div className="surface-card flex items-center justify-between gap-3 p-4">
              <div>
                <dt className="type-text-sm text-secondary">Approved, expires</dt>
                <dd className="type-heading-xs tabular-nums">2027-01-01</dd>
              </div>
              <StatusBadge status="valid" />
            </div>
            <div className="surface-card flex items-center justify-between gap-3 p-4">
              <div>
                <dt className="type-text-sm text-secondary">Latest upload, expires</dt>
                <dd className="type-heading-xs tabular-nums">2027-06-01</dd>
              </div>
              <StatusBadge status="pending" />
            </div>
          </dl>
        </div>
      </Specimen>

      <Specimen
        title="Nurse: open and claimed shifts"
        note="Cancelling your own shift is one click, with no confirmation, and uses the reason advance."
      >
        <div className="flex flex-col gap-3">
          <ShiftCard shift={SHIFT_3} action={<Button>Claim shift</Button>} />
          <ShiftCard shift={SHIFT_2} action={<Button variant="outline-danger">Cancel shift</Button>} />
        </div>
      </Specimen>

      <Specimen
        title="Agency: cancel with a reason"
        note="The agency picks the reason beside the button. It defaults to advance."
      >
        <ShiftCard
          shift={SHIFT_2}
          detail="Covered by Maria Lopez"
          action={
            <>
              <SelectField label="Reason" defaultValue="advance">
                <option value="advance">advance</option>
                <option value="no-show">no-show</option>
              </SelectField>
              <Button variant="outline-danger">Cancel shift</Button>
            </>
          }
        />
      </Specimen>

      <Specimen title="Admin: live coverage" note="Counts and table refresh on their own within five seconds.">
        <div className="mb-4 grid grid-cols-2 gap-4 md:max-w-sm">
          <Stat label="Open shifts" value={2} />
          <Stat label="Filled shifts" value={1} />
        </div>
        <ShiftTable />
      </Specimen>

      <Specimen
        title="Timesheet"
        note="Filled shifts only, labelled as scheduled because nobody clocks in. An overnight 19:00 to 07:00 counts as 12 hours."
      >
        <DataTable caption="Timesheet" columns={TIMESHEET_COLUMNS} rows={TIMESHEET_ROWS} rowKey={(r) => r.id} />
      </Specimen>

      <Specimen title="Audit log" note="Newest first, admin only, and there's no way to edit or delete an entry.">
        <DataTable caption="Audit log" columns={AUDIT_COLUMNS} rows={AUDIT_ROWS} rowKey={(r) => r.id} />
      </Specimen>
    </Section>
  )
}

const LEFT_OUT = [
  { name: "Composer, chat messages", why: "Nothing in ShiftPatch is a conversation." },
  { name: "Sidebar and rail", why: "Each role has one landing screen with everything on it." },
  { name: "Modal", why: "Cancelling is one click with no confirmation, and the post form opens inline." },
  { name: "Menus and popovers", why: "Native selects cover role and cancel reason." },
  { name: "Tooltip", why: "Every action has a visible label." },
  { name: "Switch and radio", why: "No setting or either-or choice beyond the two selects." },
  { name: "Charts", why: "Reporting stops at the open and filled counts." },
  { name: "Timesheet approval, clock-in", why: "Hours are scheduled. Approval and payroll are out of scope." },
  { name: "Inspector export", why: "Raised as an escalation rather than built." },
  { name: "Marketing site system", why: "One system per surface. This is a product." },
  { name: "Dark mode", why: "ShiftPatch ships one theme, so there is no toggle or dark token set." },
] as const

export function LeftOutSection() {
  return (
    <Section
      id="left-out"
      title="Left out on purpose"
      lede="The underlying system offers more than this. Each of these stays out until a screen needs it."
    >
      <Specimen title="Not built">
        <dl className="grid gap-x-6 gap-y-2 md:grid-cols-[240px_1fr]">
          {LEFT_OUT.map(({ name, why }) => (
            <div key={name} className="contents">
              <dt className="type-text-sm font-medium">{name}</dt>
              <dd className="mb-2 type-text-sm text-secondary md:mb-0">{why}</dd>
            </div>
          ))}
        </dl>
      </Specimen>
    </Section>
  )
}
