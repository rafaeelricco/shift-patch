import type { APIRequestContext, Page } from "@playwright/test"

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"

import { test, expect, signInAs, apiToken, authed, decoded, setExpiry, relativeDate, type AccountId } from "../fixtures"

const POLL = { timeout: 5_000 }
const ERROR = s.object({ error: s.string })
const FORBIDDEN = { error: "You don't have access to this" }
const SHIFT_KEYS = ["agencyId", "agencyName", "claimedBy", "date", "endTime", "id", "role", "startTime", "status"]
const ADMIN_ROUTES = ["/api/admin/shifts", "/api/admin/audit"]

const table = (page: Page) => page.getByTestId("admin-dashboard-shift-table")
const row = (page: Page, date: string) => table(page).locator("tbody tr").filter({ hasText: date })
const stat = (page: Page, name: "Open shifts" | "Filled shifts") => page.getByRole("group", { name, exact: true })
const keysOf = (x: unknown): ReadonlyArray<string> =>
  typeof x === "object" && x !== null && !Array.isArray(x) ? Object.keys(x).sort() : []

async function adminShifts(request: APIRequestContext) {
  const res = await request.get("/api/admin/shifts", authed(await apiToken(request, "admin-1")))
  expect(res.status()).toBe(200)
  return (await decoded(res, api.adminShifts.response)).shifts
}

async function post(request: APIRequestContext, id: AccountId, path: string, data: object) {
  const res = await request.post(path, { ...authed(await apiToken(request, id)), data })
  expect(res.status()).toBe(200)
}

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-1.11 the admin landing shows all four test IDs with no navigation", async ({ page }) => {
  await signInAs(page, "admin-1")
  await expect(table(page)).toBeVisible()
  await expect(page.getByTestId("admin-shift-status-badge")).toHaveCount(3)
  await expect(page.getByTestId("audit-log-table")).toBeVisible()
  await expect(page.getByTestId("timesheet-table")).toBeVisible()
})

test("FR-5.1 every shift lists agency, role, date, times and the covering nurse", async ({ page }) => {
  await signInAs(page, "admin-1")
  await expect(table(page).locator("tbody tr")).toHaveCount(3)
  const headers = (await table(page).locator("thead th").allInnerTexts()).map((h) => h.trim())
  expect(headers).toEqual(["Agency", "Role", "Date", "Times", "Covering nurse", "Status"])
  await expect(row(page, "2026-10-03").locator("td")).toHaveText([
    "Sunrise Health Staffing",
    "LPN",
    "2026-10-03",
    "07:00 to 19:00",
    "Maria Lopez",
    "filled",
  ])
  await expect(row(page, "2026-10-04").locator("td")).toHaveText([
    "Metro Care Partners",
    "RN",
    "2026-10-04",
    "19:00 to 07:00",
    "—",
    "open",
  ])
})

test("FR-5.1 GET /api/admin/shifts carries the shift keys plus nurseName", async ({ request }) => {
  const res = await request.get("/api/admin/shifts", authed(await apiToken(request, "admin-1")))
  expect(res.status()).toBe(200)
  const raw = await decoded(res, s.object({ shifts: s.array(s.json) }))
  expect(raw.shifts).toHaveLength(3)
  for (const shift of raw.shifts) expect(keysOf(shift)).toEqual([...SHIFT_KEYS, "nurseName"].sort())
  const shifts = await adminShifts(request)
  expect(shifts.find((x) => x.id === "shift-2")?.nurseName).toBe("Maria Lopez")
  expect(shifts.find((x) => x.id === "shift-1")?.nurseName).toBeNull()
})

test("FR-5.2 each row's admin-shift-status-badge shows the API status", async ({ page, request }) => {
  await signInAs(page, "admin-1")
  const badges = page.getByTestId("admin-shift-status-badge")
  await expect(badges).toHaveCount(3)
  const shown = (await badges.allInnerTexts()).map((t) => t.trim()).sort()
  expect(shown).toEqual((await adminShifts(request)).map((x) => x.status).sort())
  await expect(row(page, "2026-10-03").getByTestId("admin-shift-status-badge")).toHaveText("filled")
})

test("FR-5.3 the dashboard counts open and filled shifts", async ({ page }) => {
  await signInAs(page, "admin-1")
  await expect(stat(page, "Open shifts")).toContainText("2")
  await expect(stat(page, "Filled shifts")).toContainText("1")
})

test("FR-5.4 a cancel and a claim made elsewhere show within 5 s without a reload", async ({ page, request }) => {
  await signInAs(page, "admin-1")
  await expect(row(page, "2026-10-03").getByTestId("admin-shift-status-badge")).toHaveText("filled")

  await post(request, "nurse-1", "/api/shifts/shift-2/cancel", { reason: "advance" })
  await expect(row(page, "2026-10-03").getByTestId("admin-shift-status-badge")).toHaveText("open", POLL)
  await expect(row(page, "2026-10-03").locator("td").nth(4)).toHaveText("—", POLL)
  await expect(stat(page, "Open shifts")).toContainText("3", POLL)
  await expect(stat(page, "Filled shifts")).toContainText("0", POLL)

  await post(request, "nurse-1", "/api/shifts/shift-1/claim", {})
  await expect(row(page, "2026-10-02").getByTestId("admin-shift-status-badge")).toHaveText("filled", POLL)
  await expect(row(page, "2026-10-02").locator("td").nth(4)).toHaveText("Maria Lopez", POLL)
})

test("FR-5.5 nurse and agency tokens get 403 on admin routes, and no token gets 401", async ({ request }) => {
  for (const id of ["nurse-1", "nurse-2", "agency-a", "agency-b"] as const) {
    const token = await apiToken(request, id)
    for (const path of ADMIN_ROUTES) {
      const res = await request.get(path, authed(token))
      expect(res.status()).toBe(403)
      expect(await decoded(res, ERROR)).toEqual(FORBIDDEN)
    }
  }
  for (const path of ADMIN_ROUTES) {
    const res = await request.get(path)
    expect(res.status()).toBe(401)
    expect(await decoded(res, ERROR)).toEqual({ error: "Session expired, sign in again" })
  }
})

for (const id of ["nurse-1", "agency-a"] as const) {
  test(`FR-5.5 ${id} never sees the admin dashboard`, async ({ page }) => {
    await signInAs(page, id) // waits for that role's landing screen
    await expect(page.getByTestId("admin-dashboard-shift-table")).toHaveCount(0)
    await expect(page.getByTestId("admin-shift-status-badge")).toHaveCount(0)
  })
}
