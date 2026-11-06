import type { APIRequestContext, Page } from "@playwright/test"

import * as s from "@lib/json/schema"
import type { Json } from "@lib/json/types"
import { api } from "@api/endpoints"

import {
  notification,
  test,
  expect,
  signInAs,
  apiToken,
  authed,
  decoded,
  insertShift,
  setExpiry,
  relativeDate,
  type AccountId,
} from "../fixtures"

const POLL = { timeout: 5_000 }
const ROW_KEYS = ["shiftId", "nurseId", "nurseName", "agencyId", "agencyName", "date", "startTime", "endTime", "hours"]
const keysOf = (x: Json | undefined): ReadonlyArray<string> =>
  typeof x === "object" && x !== null && !Array.isArray(x) ? Object.keys(x).sort() : []

const table = (page: Page) => page.getByTestId("timesheet-table")
const tableRow = (page: Page, text: string) => table(page).locator("tbody tr").filter({ hasText: text })

async function timesheet(request: APIRequestContext, token: string) {
  const res = await request.get("/api/timesheet", authed(token))
  expect(res.status()).toBe(200)
  return (await decoded(res, api.timesheet.response)).rows
}
const shiftIds = async (request: APIRequestContext, id: AccountId) =>
  (await timesheet(request, await apiToken(request, id))).map((r) => r.shiftId.value).sort()

async function claimApi(request: APIRequestContext, token: string, id: string) {
  const res = await request.post(`/api/shifts/${id}/claim`, { ...authed(token), data: {} })
  expect(res.status()).toBe(200)
  return decoded(res, api.claimShift.response)
}

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-9.1 timesheet-table lists Maria's filled shifts with nurse, agency, date, times and scheduled hours", async ({
  page,
}) => {
  await signInAs(page, "nurse-1")
  const region = page.getByRole("region", { name: "Scheduled hours", exact: true })
  await expect(region.getByTestId("timesheet-table")).toBeVisible()
  const headers = (await table(page).locator("thead th").allInnerTexts()).map((h) => h.trim())
  expect(headers).toEqual(["Nurse", "Agency", "Date", "Times", "Scheduled hours"])
  expect(headers).not.toContain("Hours")

  const row = tableRow(page, "2026-10-03")
  await expect(row).toHaveCount(1)
  const cells = row.locator("td")
  await expect(cells).toHaveText(["Maria Lopez", "Sunrise Health Staffing", "2026-10-03", "07:00 to 19:00", "12"])
  await expect(cells.nth(4)).toHaveCSS("text-align", "right")
})

test("FR-9.1 GET /api/timesheet rows carry exactly the documented keys", async ({ request }) => {
  const res = await request.get("/api/timesheet", authed(await apiToken(request, "nurse-1")))
  expect(res.status()).toBe(200)
  const body = await decoded(res, s.json)
  expect(keysOf(body)).toEqual(["rows"])
  const rows = await decoded(res, s.object({ rows: s.array(s.json) }))
  expect(rows.rows.length).toBeGreaterThan(0)
  for (const r of rows.rows) expect(keysOf(r)).toEqual([...ROW_KEYS].sort())
})

test("FR-9.1 timesheet-table stays rendered when empty", async ({ page }) => {
  await signInAs(page, "nurse-2")
  await expect(table(page)).toBeVisible()
  await expect(table(page).getByText("No scheduled hours yet")).toBeVisible()
})

test("FR-9.1 a claim adds a row and a cancel removes it on the next read", async ({ page }) => {
  await signInAs(page, "nurse-1")
  await page
    .getByRole("region", { name: "Open shifts", exact: true })
    .getByTestId("shift-list-item")
    .filter({ hasText: "2026-10-02" })
    .getByRole("button", { name: "Claim shift" })
    .click()
  await expect(notification(page).locator("[data-title]")).toHaveText("Shift claimed")

  const row = tableRow(page, "2026-10-02")
  await expect(row).toHaveCount(1, POLL)
  await expect(row.locator("td").nth(3)).toHaveText("19:00 to 07:00")
  await expect(row.locator("td").nth(4)).toHaveText("12")

  await page
    .getByRole("region", { name: "Your shifts", exact: true })
    .locator("article")
    .filter({ hasText: "2026-10-02" })
    .getByTestId("shift-cancel-button")
    .click({ delay: 2100 })
  await expect(notification(page).locator("[data-title]")).toHaveText("Shift cancelled, now open")
  await expect(row).toHaveCount(0, POLL)
})

test("FR-9.2 overnight and half-hour shifts count correctly", async ({ page, request }) => {
  const token = await apiToken(request, "nurse-1")
  await claimApi(request, token, "shift-1")
  const date = relativeDate(10)
  await insertShift({
    id: "shift-9001",
    agencyId: "agency-a",
    role: "RN",
    date,
    startTime: "07:30",
    endTime: "19:00",
    claimedBy: "nurse-1",
  })
  await insertShift({
    id: "shift-9002",
    agencyId: "agency-b",
    role: "LPN",
    date,
    startTime: "23:30",
    endTime: "00:30",
    claimedBy: "nurse-1",
  })

  const rows = await timesheet(request, token)
  const hours = (id: string) => rows.find((r) => r.shiftId.value === id)?.hours
  expect(hours("shift-1")).toBe(12)
  expect(hours("shift-9001")).toBe(11.5)
  expect(hours("shift-9002")).toBe(1)

  await signInAs(page, "nurse-1")
  await expect(tableRow(page, "07:30 to 19:00").locator("td").nth(4)).toHaveText("11.5")
})

test("FR-9.3 each role sees only its own scope", async ({ request }) => {
  expect(await shiftIds(request, "nurse-1")).toEqual(["shift-2"])
  expect(await shiftIds(request, "agency-a")).toEqual(["shift-2"])
  expect(await shiftIds(request, "admin-1")).toEqual(["shift-2"])
  expect(await shiftIds(request, "nurse-2")).toEqual([])
  expect(await shiftIds(request, "agency-b")).toEqual([])

  await claimApi(request, await apiToken(request, "nurse-1"), "shift-3")
  expect(await shiftIds(request, "agency-b")).toEqual(["shift-3"])
  expect(await shiftIds(request, "agency-a")).toEqual(["shift-2"])
  expect(await shiftIds(request, "admin-1")).toEqual(["shift-2", "shift-3"])
  expect(await shiftIds(request, "nurse-2")).toEqual([])
  expect(await shiftIds(request, "nurse-1")).toEqual(["shift-2", "shift-3"])
})
