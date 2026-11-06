export {
  test,
  expect,
  ACCOUNTS,
  PASSWORD,
  signInAs,
  notification,
  signOutVia,
  apiToken,
  authed,
  decoded,
  insertShift,
  setExpiry,
  relativeDate,
  seededShift,
  type AccountId,
  type AuditLog,
}

import {
  test as base,
  expect as baseExpect,
  request as apiRequest,
  type APIRequestContext,
  type APIResponse,
  type Page,
} from "@playwright/test"

import * as s from "@lib/json/schema"
import { db, sql, SAMPLE } from "@lib/db"
import { resetToSeed } from "@lib/seed"
import { DateOnly } from "@lib/time"
import { Id } from "@lib/id"
import type { Shift } from "@api/endpoints"

type Account = (typeof SAMPLE.accounts)[number]
type AccountId = Account["id"]
const ACCOUNTS = Object.fromEntries(SAMPLE.accounts.map((a) => [a.id, a])) as Record<AccountId, Account>
const PASSWORD = SAMPLE.password
// A local binding: Playwright's Babel transform can't re-export an imported name from a leading export list.
const expect = baseExpect

/** Audit entries written during this test only. The log survives resets (FR-10.3), so `auditLog` reads past a baseline. */
const schema_entry = s.object({
  action: s.string,
  actor_id: s.nullable(s.string),
  record_id: s.string,
  reason: s.nullable(s.string),
  previous_nurse_id: s.nullable(s.string),
})
type AuditLog = { entries(recordId?: string): Promise<ReadonlyArray<s.Infer<typeof schema_entry>>> }

// Every test starts from the exact sample data.
const test = base.extend<{ seeded: void; auditLog: AuditLog }>({
  seeded: [
    // Playwright requires an object pattern for the fixtures argument, even when none are used.
    async ({}, provide) => {
      await resetToSeed().promise((e) => new Error(`${e.type}: ${e.message}`))
      await provide()
    },
    { auto: true },
  ],
  // `provide`, not `use`: the React hooks lint rule would read Playwright's `use` as a hook.
  auditLog: async ({ seeded: _ }, provide) => {
    const { max } = await db
      .one(sql`SELECT coalesce(max(id), 0)::int AS max FROM audit_log`, s.object({ max: s.number }))
      .promise((e) => new Error(e.message))
    await provide({
      entries: (recordId) =>
        db
          .rows(
            sql`SELECT action, actor_id, record_id, reason, previous_nurse_id FROM audit_log WHERE id > ${max}
              ${recordId === undefined ? sql`` : sql`AND record_id = ${recordId}`} ORDER BY id`,
            schema_entry
          )
          .promise((e) => new Error(e.message)),
    })
  },
})

/** The current outcome; Sonner briefly retains dismissed items for its exit transition. */
function notification(page: Page) {
  return page.getByTestId("notification-banner").and(page.locator('[data-removed="false"][data-visible="true"]'))
}

/** Signs in through the UI and waits for that role's landing screen. */
async function signInAs(page: Page, id: AccountId): Promise<void> {
  await page.goto("/")
  await page.getByTestId("login-email-input").fill(ACCOUNTS[id].email)
  await page.getByTestId("login-password-input").fill(PASSWORD)
  await page.getByTestId("login-submit-button").click()
  await expect(account(page, id)).toBeVisible()
}

const account = (page: Page, id: AccountId) =>
  page.getByRole("button", { name: `Account: ${ACCOUNTS[id].name}, ${ACCOUNTS[id].role}` }).first()

/** Sign out through the desktop menu or compact account sheet. */
async function signOutVia(page: Page, id: AccountId): Promise<void> {
  await account(page, id).click()
  await page
    .getByRole("menuitem", { name: "Sign out", exact: true })
    .or(
      page.getByRole("dialog", { name: "Account", exact: true }).getByRole("button", { name: "Sign out", exact: true })
    )
    .click()
  await expect(page.getByTestId("login-email-input")).toBeVisible()
}

/**
 * A Bearer token for `id`. Login also sets the `sid` cookie, so it runs in a throwaway context: the caller's `request`
 * stays cookie-free, and a call without `authed(token)` is still anonymous.
 */
async function apiToken(_request: APIRequestContext, id: AccountId): Promise<string> {
  const baseURL = test.info().project.use.baseURL
  const login = await apiRequest.newContext(baseURL === undefined ? {} : { baseURL })
  try {
    const res = await login.post("/api/auth/login", { data: { email: ACCOUNTS[id].email, password: PASSWORD } })
    expect(res.status()).toBe(200)
    return (await decoded(res, s.object({ token: s.string }))).token
  } finally {
    await login.dispose()
  }
}

const authed = (token: string) => ({ headers: { Authorization: `Bearer ${token}` } })

/** Decode a reply with an endpoint schema, so specs never touch an untyped body (no `any`). */
async function decoded<T>(res: APIResponse, schema: s.Schema<T>): Promise<T> {
  const body: unknown = await res.json()
  return s.decode(schema, body).either(
    (e) => {
      throw new Error(`Unexpected reply: ${e}`)
    },
    (x) => x
  )
}

/** Test-only rows; ids from shift-9001 up never meet the shift_number sequence. */
async function insertShift(x: {
  id: string
  agencyId: "agency-a" | "agency-b"
  role: "RN" | "LPN"
  date: string
  startTime: string
  endTime: string
  claimedBy: AccountId | null
}): Promise<void> {
  await db
    .execute(
      sql`INSERT INTO shifts (id, agency_id, role, date, start_time, end_time, claimed_by)
      VALUES (${x.id}, ${x.agencyId}, ${x.role}, ${x.date}, ${x.startTime}, ${x.endTime}, ${x.claimedBy})`
    )
    .promise((e) => new Error(e.message))
}

/** Sets a nurse's approved expiry by direct SQL, so no test depends on the wall clock. */
async function setExpiry(nurseId: AccountId, date: string): Promise<void> {
  await db
    .execute(sql`UPDATE credentials SET expires_on = ${date}::date WHERE nurse_id = ${nurseId}`)
    .promise((e) => new Error(e.message))
}

/** `days` from UTC today, as `YYYY-MM-DD`. Negative is the past. */
function relativeDate(days: number): string {
  return DateOnly.todayUTC().addDays(days).pretty()
}

/** One seeded shift as `GET /api/shifts` returns it before any change, projected from `SAMPLE.shifts`. */
function seededShift(id: (typeof SAMPLE.shifts)[number]["id"]): Shift {
  const x = SAMPLE.shifts.find((shift) => shift.id === id)
  if (x === undefined) throw new Error(`${id} is not a seeded shift`) // programmer error: the type already rules it out
  return {
    ...x,
    id: new Id<"Shift">(x.id),
    agencyId: new Id<"User">(x.agencyId),
    claimedBy: x.claimedBy === null ? null : new Id<"User">(x.claimedBy),
    agencyName: ACCOUNTS[x.agencyId].name,
    status: x.claimedBy === null ? "open" : "filled",
  }
}
