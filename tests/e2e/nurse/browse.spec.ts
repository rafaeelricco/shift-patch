import type { Page } from "@playwright/test"

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { SAMPLE } from "@lib/db"

import {
  test,
  expect,
  ACCOUNTS,
  signInAs,
  apiToken,
  authed,
  decoded,
  setExpiry,
  relativeDate,
  seededShift,
} from "../fixtures"

const SHIFT_KEYS = ["agencyId", "agencyName", "claimedBy", "date", "endTime", "id", "role", "startTime", "status"]
const POLL = { timeout: 5_000 }
const RAW_LIST = s.object({ shifts: s.array(s.json) })
const keysOf = (x: unknown): ReadonlyArray<string> =>
  typeof x === "object" && x !== null && !Array.isArray(x) ? Object.keys(x).sort() : []

const open = (page: Page) => page.getByRole("region", { name: "Open shifts" })
const mine = (page: Page) => page.getByRole("region", { name: "Your shifts" })
const banner = (page: Page) => page.getByTestId("notification-banner")

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-3.1 GET /api/shifts returns exactly { shifts } with every seeded shift for every role", async ({
  request,
}) => {
  for (const { id } of SAMPLE.accounts) {
    const res = await request.get("/api/shifts", authed(await apiToken(request, id)))
    expect(res.status()).toBe(200)
    const raw: unknown = await res.json()
    expect(keysOf(raw)).toEqual(["shifts"])
    const { shifts } = await decoded(res, api.listShifts.response)
    expect(shifts).toEqual(SAMPLE.shifts.map((x) => seededShift(x.id)))
    for (const shift of (await decoded(res, RAW_LIST)).shifts) expect(keysOf(shift)).toEqual([...SHIFT_KEYS].sort())
    for (const shift of shifts.filter((x) => x.status === "open")) expect(shift.claimedBy).toBeNull()
  }
})

test("FR-3.1 filled and other-agency shifts are listed too", async ({ request }) => {
  const claim = await request.post("/api/shifts/shift-3/claim", {
    ...authed(await apiToken(request, "nurse-1")),
    data: {},
  })
  expect(claim.status()).toBe(200)
  const res = await request.get("/api/shifts", authed(await apiToken(request, "nurse-2")))
  const { shifts } = await decoded(res, api.listShifts.response)
  expect(shifts).toHaveLength(3)
  const shift3 = shifts.find((x) => x.id === "shift-3")
  expect(shift3?.status).toBe("filled")
  expect(shift3?.agencyName).toBe(ACCOUNTS["agency-b"].name)
  expect(shift3?.agencyName).toBe("Metro Care Partners")
})

test("FR-3.2 each open shift is one shift-list-item with its own shift-claim-button", async ({ page }) => {
  await signInAs(page, "nurse-1")
  const cards = open(page).getByTestId("shift-list-item")
  await expect(cards).toHaveCount(2)
  const first = cards.filter({ hasText: "2026-10-02" })
  await expect(first).toHaveCount(1)
  await expect(first).toContainText("19:00 to 07:00")
  await expect(first).toContainText("Sunrise Health Staffing")
  await expect(first.getByText("open", { exact: true })).toBeVisible()
  for (let i = 0; i < 2; i++) await expect(cards.nth(i).getByTestId("shift-claim-button")).toHaveCount(1)
  await expect(mine(page).getByTestId("shift-list-item")).toHaveCount(0)
})

test("FR-3.2 an empty open list says No open shifts right now", async ({ page, request }) => {
  const token = await apiToken(request, "nurse-1")
  for (const id of ["shift-1", "shift-3"]) {
    const res = await request.post(`/api/shifts/${id}/claim`, { ...authed(token), data: {} })
    expect(res.status()).toBe(200)
  }
  await signInAs(page, "nurse-2")
  await expect(open(page).getByText("No open shifts right now")).toBeVisible()
  await expect(page.getByTestId("shift-list-item")).toHaveCount(0)
})

test("FR-3.2 a failed first load shows Couldn't load shifts with Try again and no banner", async ({ page }) => {
  await page.route("**/api/shifts", (route) => route.abort())
  await signInAs(page, "nurse-1")
  await expect(open(page).getByText("Couldn't load shifts", { exact: true })).toBeVisible()
  await expect(banner(page)).toHaveCount(0)
  await page.unroute("**/api/shifts")
  await open(page).getByRole("button", { name: "Try again" }).click()
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2)
})

test("FR-3.2 a change from another session appears on the next poll without a banner", async ({ page, request }) => {
  await signInAs(page, "nurse-2")
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2)
  const url = page.url()
  const res = await request.post("/api/shifts/shift-3/claim", {
    ...authed(await apiToken(request, "nurse-1")),
    data: {},
  })
  expect(res.status()).toBe(200)
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(1, POLL)
  await expect(banner(page)).toHaveCount(0)
  expect(page.url()).toBe(url)
})

test("FR-3.2 a failed poll keeps the last good list, says Couldn't refresh, and shows no banner", async ({ page }) => {
  await signInAs(page, "nurse-1")
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2)
  await page.route("**/api/shifts", (route) => route.abort())
  await page.waitForRequest("**/api/shifts", POLL)
  await page.waitForRequest("**/api/shifts", POLL)
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2)
  await expect(page.getByText("Couldn't load shifts", { exact: true })).toHaveCount(0)
  await expect(banner(page)).toHaveCount(0)
  await expect(open(page).getByText(/Couldn't refresh, showing \d{2}:\d{2}/)).toBeVisible(POLL)
  await expect(page.getByRole("region", { name: "Credential" }).getByText(/Couldn't refresh/)).toHaveCount(0)
  await page.unroute("**/api/shifts")
  await expect(page.getByText(/Couldn't refresh/)).toHaveCount(0, POLL)
})

test("FR-3.2 a slow read is never cancelled by the next poll", async ({ page }) => {
  const isList = (url: string) => new URL(url).pathname === "/api/shifts"
  const finished: Array<string> = []
  const failed: Array<string> = []
  page.on("requestfinished", (r) => {
    if (isList(r.url())) finished.push(r.url())
  })
  page.on("requestfailed", (r) => {
    if (isList(r.url())) failed.push(r.url())
  })
  await page.route(
    "**/api/shifts",
    (route) => {
      setTimeout(() => void route.continue(), 4_000)
    },
    { times: 1 }
  )
  await signInAs(page, "nurse-1")
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2, { timeout: 8_000 })
  expect(finished.length).toBeGreaterThanOrEqual(1)
  expect(failed).toEqual([])
})
