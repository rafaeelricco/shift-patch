import type { APIRequestContext, Dialog, Page } from "@playwright/test"

import * as s from "@lib/json/schema"
import { api, type Shift } from "@api/endpoints"
import { resetToSeed } from "@lib/seed"

import {
  test,
  expect,
  signInAs,
  apiToken,
  authed,
  decoded,
  setExpiry,
  relativeDate,
  seededShift,
  type AccountId,
} from "../fixtures"

const ERROR = s.object({ error: s.string })
const keys = async (res: { json: () => Promise<unknown> }) => {
  const body = await res.json()
  return typeof body === "object" && body !== null ? Object.keys(body).sort() : []
}
const SHIFT_KEYS = ["id", "agencyId", "agencyName", "role", "date", "startTime", "endTime", "status", "claimedBy"]
const POLL = { timeout: 5_000 }
const INVALID_REASON = { error: "Reason must be no-show or advance" }

const open = (page: Page) => page.getByRole("region", { name: "Open shifts" })
const mine = (page: Page) => page.getByRole("region", { name: "Your shifts" })
const banner = (page: Page) => page.getByTestId("notification-banner")
const openCard = (page: Page, date: string) => open(page).getByTestId("shift-list-item").filter({ hasText: date })
const mineCard = (page: Page, date: string) => mine(page).locator("article").filter({ hasText: date })

/** `body` undefined sends no body at all; a string is sent raw. */
async function cancel(request: APIRequestContext, id: AccountId | null, shiftId: string, body?: unknown) {
  const headers = id === null ? {} : authed(await apiToken(request, id)).headers
  return request.post(`/api/shifts/${shiftId}/cancel`, body === undefined ? { headers } : { headers, data: body })
}

async function claim(request: APIRequestContext, id: AccountId, shiftId: string) {
  return request.post(`/api/shifts/${shiftId}/claim`, authed(await apiToken(request, id)))
}

async function shifts(request: APIRequestContext, id: AccountId): Promise<ReadonlyArray<Shift>> {
  const res = await request.get("/api/shifts", authed(await apiToken(request, id)))
  expect(res.status()).toBe(200)
  return (await decoded(res, api.listShifts.response)).shifts
}

async function shiftIn(request: APIRequestContext, id: AccountId, shiftId: string): Promise<Shift | undefined> {
  return (await shifts(request, id)).find((x) => x.id === shiftId)
}

async function expectBanner(page: Page, text: string): Promise<void> {
  await expect(banner(page)).toHaveCount(1)
  await expect(banner(page)).toHaveText(text)
}

const reopened = { ...seededShift("shift-2"), status: "open", claimedBy: null }

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-6.1 the assigned nurse cancels and gets the open shift plus cancellation", async ({ request, auditLog }) => {
  const res = await cancel(request, "nurse-1", "shift-2", { reason: "advance" })
  expect(res.status()).toBe(200)
  expect(await keys(res)).toEqual([...SHIFT_KEYS, "cancellation"].sort())
  expect(await decoded(res, api.cancelShift.response)).toEqual({
    ...reopened,
    cancellation: { reason: "advance", previousNurseId: "nurse-1" },
  })
  expect(await shiftIn(request, "admin-1", "shift-2")).toEqual(reopened)
  expect(await auditLog.entries("shift-2")).toEqual([
    {
      action: "shift.cancelled",
      actor_id: "nurse-1",
      record_id: "shift-2",
      reason: "advance",
      previous_nurse_id: "nurse-1",
    },
  ])
})

test("FR-6.1 no-show is accepted and recorded", async ({ request, auditLog }) => {
  const res = await cancel(request, "agency-a", "shift-2", { reason: "no-show" })
  expect(res.status()).toBe(200)
  expect((await decoded(res, api.cancelShift.response)).cancellation.reason).toBe("no-show")
  expect(await auditLog.entries("shift-2")).toEqual([
    {
      action: "shift.cancelled",
      actor_id: "agency-a",
      record_id: "shift-2",
      reason: "no-show",
      previous_nurse_id: "nurse-1",
    },
  ])
})

test("FR-6.6 the previous nurse survives a seed reset", async ({ request, auditLog }) => {
  expect((await cancel(request, "agency-a", "shift-2", { reason: "no-show" })).status()).toBe(200)
  await resetToSeed().promise((e) => new Error(`${e.type}: ${e.message}`))
  const cancelled = (await auditLog.entries("shift-2")).filter((e) => e.action === "shift.cancelled")
  expect(cancelled).toEqual([
    {
      action: "shift.cancelled",
      actor_id: "agency-a",
      record_id: "shift-2",
      reason: "no-show",
      previous_nurse_id: "nurse-1",
    },
  ])
})

test("FR-6.2 a missing or invalid reason is 400 { error: 'Reason must be no-show or advance' }", async ({
  request,
  auditLog,
}) => {
  const bodies: ReadonlyArray<{ label: string; body?: unknown }> = [
    { label: "{}", body: {} },
    { label: "cancelled", body: { reason: "cancelled" } },
    { label: "No-show", body: { reason: "No-show" } },
    { label: "not json", body: "not json" },
    { label: "no body" },
  ]
  for (const { label, body } of bodies) {
    const res = await cancel(request, "agency-a", "shift-2", body)
    expect(res.status(), label).toBe(400)
    expect(await decoded(res, ERROR), label).toEqual(INVALID_REASON)
    expect(await keys(res), label).toEqual(["error"])
  }
  expect(await shiftIn(request, "admin-1", "shift-2")).toEqual(seededShift("shift-2"))
  expect(await auditLog.entries("shift-2")).toEqual([])
})

test("FR-6.3 the owning agency and the admin may cancel", async ({ request }) => {
  expect((await cancel(request, "agency-a", "shift-2", { reason: "no-show" })).status()).toBe(200)
  expect((await claim(request, "nurse-1", "shift-2")).status()).toBe(200)
  const res = await cancel(request, "admin-1", "shift-2", { reason: "advance" })
  expect(res.status()).toBe(200)
  expect(await shiftIn(request, "admin-1", "shift-2")).toEqual(reopened)
})

test('FR-6.3 another agency gets 403 { error: "You don\'t have access to this" }', async ({ request }) => {
  const res = await cancel(request, "agency-b", "shift-2", { reason: "no-show" })
  expect(res.status()).toBe(403)
  expect(await decoded(res, ERROR)).toEqual({ error: "You don't have access to this" })
  expect(await shiftIn(request, "admin-1", "shift-2")).toEqual(seededShift("shift-2"))
})

test("FR-6.3 a nurse who does not hold the shift gets 403 { error: 'Shift no longer assigned to you' }", async ({
  request,
}) => {
  const res = await cancel(request, "nurse-2", "shift-2", { reason: "advance" })
  expect(res.status()).toBe(403)
  expect(await decoded(res, ERROR)).toEqual({ error: "Shift no longer assigned to you" })
  expect(await shiftIn(request, "admin-1", "shift-2")).toEqual(seededShift("shift-2"))
})

test("FR-6.4 cancel checks run 401, 404, 403, 400, 409 in that order", async ({ request }) => {
  const bogus = { reason: "bogus" }
  const advance = { reason: "advance" }
  const rows: ReadonlyArray<{ who: AccountId | null; shift: string; body: unknown; status: number; error: string }> = [
    { who: null, shift: "shift-404", body: bogus, status: 401, error: "Session expired, sign in again" },
    { who: "nurse-1", shift: "shift-404", body: bogus, status: 404, error: "Shift not found" },
    { who: "agency-b", shift: "shift-2", body: bogus, status: 403, error: "You don't have access to this" },
    { who: "nurse-2", shift: "shift-2", body: bogus, status: 403, error: "Shift no longer assigned to you" },
    { who: "agency-a", shift: "shift-1", body: bogus, status: 400, error: INVALID_REASON.error },
    { who: "nurse-1", shift: "shift-1", body: bogus, status: 400, error: INVALID_REASON.error },
    { who: "agency-a", shift: "shift-1", body: advance, status: 409, error: "Shift is already open" },
    { who: "nurse-1", shift: "shift-1", body: advance, status: 409, error: "Shift is already open" },
    { who: "nurse-2", shift: "shift-3", body: advance, status: 409, error: "Shift is already open" },
  ]
  for (const row of rows) {
    const label = `${row.who ?? "no token"} on ${row.shift}`
    const res = await cancel(request, row.who, row.shift, row.body)
    expect(res.status(), label).toBe(row.status)
    expect(await decoded(res, ERROR), label).toEqual({ error: row.error })
  }
})

test("FR-6.5 a cancelled shift can be claimed again", async ({ request }) => {
  expect((await cancel(request, "nurse-1", "shift-2", { reason: "advance" })).status()).toBe(200)
  const res = await claim(request, "nurse-1", "shift-2")
  expect(res.status()).toBe(200)
  expect(await decoded(res, api.claimShift.response)).toEqual({
    ...seededShift("shift-2"),
    status: "filled",
    claimedBy: "nurse-1",
  })
})

test("FR-6.7 shift-cancel-button sits only on Maria's claimed shifts and requires a hold", async ({
  page,
  browser,
  request,
}) => {
  const dialogs: Array<Dialog> = []
  page.on("dialog", (d) => {
    dialogs.push(d)
    void d.dismiss()
  })
  await signInAs(page, "nurse-1")
  await expect(mine(page).getByTestId("shift-cancel-button")).toHaveCount(1)
  await expect(mine(page).getByTestId("shift-list-item")).toHaveCount(0)

  const claimed = mineCard(page, "2026-10-03")
  await expect(mine(page).getByRole("heading", { name: /2026-10-03/ })).toBeVisible()
  await expect(claimed.getByText("12 scheduled hours", { exact: true })).toBeVisible()
  const button = claimed.getByTestId("shift-cancel-button")
  let requests = 0
  page.on("request", (req) => {
    if (req.method() === "POST" && req.url().endsWith("/cancel")) requests++
  })
  await button.click()
  await expect(button).toBeVisible()
  expect(requests).toBe(0)
  await button.click({ delay: 2100 })
  await expectBanner(page, "Shift cancelled, now open")
  expect(requests).toBe(1)
  await expect(page.getByRole("dialog")).toHaveCount(0)
  const card = openCard(page, "2026-10-03")
  await expect(card.getByTestId("shift-claim-button")).toBeVisible()
  await expect(card.getByText("open", { exact: true })).toBeVisible()
  await expect(mine(page).getByTestId("shift-cancel-button")).toHaveCount(0)
  expect(dialogs).toHaveLength(0)

  await page.reload()
  await expect(openCard(page, "2026-10-03")).toHaveCount(1)

  const other = await browser.newContext()
  const james = await other.newPage()
  await signInAs(james, "nurse-2")
  await expect(open(james).getByTestId("shift-list-item")).toHaveCount(3)
  await other.close()

  expect(await shiftIn(request, "admin-1", "shift-2")).toEqual(reopened)
})

test("FR-6.7 a nurse never sees shift-cancel-button on an open shift", async ({ page, request }) => {
  await signInAs(page, "nurse-2")
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2)
  await expect(page.getByTestId("shift-cancel-button")).toHaveCount(0)
  expect((await claim(request, "nurse-1", "shift-3")).status()).toBe(200)
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(1, POLL)
  await expect(page.getByTestId("shift-cancel-button")).toHaveCount(0)
})

test("FR-6.8 a nurse's cancel sends reason advance", async ({ page, auditLog }) => {
  await signInAs(page, "nurse-1")
  const [req] = await Promise.all([
    page.waitForRequest("**/cancel"),
    mineCard(page, "2026-10-03").getByTestId("shift-cancel-button").press("Space", { delay: 2100 }),
  ])
  const body: unknown = req.postDataJSON()
  expect(body).toEqual({ reason: "advance" })
  await expectBanner(page, "Shift cancelled, now open")
  expect((await auditLog.entries("shift-2")).map((e) => e.reason)).toEqual(["advance"])
})

test("FR-6.8 cancelling a shift already reopened elsewhere shows Shift is already open and re-reads", async ({
  page,
  request,
}) => {
  await signInAs(page, "nurse-1")
  const button = mineCard(page, "2026-10-03").getByTestId("shift-cancel-button")
  await expect(button).toBeVisible()
  await page.route("**/api/shifts", (r) => r.abort())
  expect((await cancel(request, "agency-a", "shift-2", { reason: "no-show" })).status()).toBe(200)
  await button.click({ delay: 2100 })
  await expectBanner(page, "Shift is already open")
  await page.unroute("**/api/shifts")
  await expect(openCard(page, "2026-10-03")).toHaveCount(1, POLL)
  await expect(mineCard(page, "2026-10-03")).toHaveCount(0)
})

test("FR-6.7 a network failure shows a retry line and keeps the card", async ({ page }) => {
  await signInAs(page, "nurse-1")
  await page.route("**/cancel", (r) => r.abort())
  await mineCard(page, "2026-10-03").getByTestId("shift-cancel-button").click({ delay: 2100 })
  await expectBanner(page, "Couldn't cancel shift, try again")
  await expect(mineCard(page, "2026-10-03").getByTestId("shift-cancel-button")).toBeVisible()
})

test("FR-6.9 a cancelled shift reads open everywhere and cancelled is never a status", async ({ page, request }) => {
  expect((await cancel(request, "nurse-1", "shift-2", { reason: "advance" })).status()).toBe(200)
  for (const id of ["nurse-1", "nurse-2", "agency-a", "agency-b", "admin-1"] as const) {
    for (const x of await shifts(request, id)) expect(["open", "filled"], `${id} ${x.id}`).toContain(x.status)
  }
  await signInAs(page, "nurse-1")
  await expect(openCard(page, "2026-10-03").getByText("open", { exact: true })).toBeVisible()
  await expect(page.getByText("cancelled", { exact: true })).toHaveCount(0)
  const res = await request.get("/api/timesheet", authed(await apiToken(request, "admin-1")))
  expect(res.status()).toBe(200)
  expect((await decoded(res, api.timesheet.response)).rows.map((r) => r.shiftId)).not.toContain("shift-2")
})
