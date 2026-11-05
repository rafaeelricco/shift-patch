import type { APIRequestContext, Page } from "@playwright/test"

import { api } from "@api/endpoints"

import { test, expect, signInAs, apiToken, authed, decoded, setExpiry, relativeDate } from "../fixtures"

const POLL = { timeout: 5_000 }
const banner = (page: Page) => page.getByTestId("notification-banner")
const shiftsRegion = (page: Page) => page.getByRole("region", { name: "Your agency's shifts" })
const card = (page: Page, date: string) => shiftsRegion(page).locator("article").filter({ hasText: date })

async function expectBanner(page: Page, text: string): Promise<void> {
  await expect(banner(page)).toHaveCount(1)
  await expect(banner(page)).toHaveText(text)
}

async function agencyShifts(request: APIRequestContext) {
  const res = await request.get("/api/agencies/agency-a/shifts", authed(await apiToken(request, "agency-a")))
  return (await decoded(res, api.agencyShifts.response)).shifts
}

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-1.10 the agency landing screen shows its three test IDs without navigation", async ({ page }) => {
  await signInAs(page, "agency-a")
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId("agency-post-shift-button")).toBeVisible()
  await expect(page.getByTestId("shift-cancel-button")).toHaveCount(1) // shift-2, the only filled one
  await expect(page.getByTestId("timesheet-table")).toBeVisible()
  await expect(page.getByTestId("notification-banner")).toHaveCount(0)
})

test("FR-2.10 the post form opens with valid defaults and posts unchanged", async ({ page, request }) => {
  await signInAs(page, "agency-a")
  await expect(page.getByTestId("agency-post-shift-submit-button")).toHaveCount(0)
  await page.getByTestId("agency-post-shift-button").click()
  const sent = page.waitForRequest((req) => req.url().endsWith("/api/shifts") && req.method() === "POST")
  await page.getByTestId("agency-post-shift-submit-button").click()
  const body: unknown = (await sent).postDataJSON()
  expect(body).toEqual({ role: "RN", date: relativeDate(0), startTime: "07:00", endTime: "19:00" })
  await expectBanner(page, "Shift posted")
  await expect(page.getByTestId("agency-post-shift-submit-button")).toHaveCount(0)
  await expect(card(page, relativeDate(0))).toContainText("RN shift")
  await expect(card(page, relativeDate(0))).toContainText("open")
  expect((await agencyShifts(request)).map((x) => x.date)).toContain(relativeDate(0))
})

test("FR-2.10 the form posts edited values, including an overnight shift", async ({ page }) => {
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  const form = page.getByRole("form", { name: "Post a shift" })
  await form.getByRole("combobox", { name: "Role" }).click()
  await page.getByRole("option", { name: "LPN" }).click()
  await form.getByLabel("Date").fill("2026-12-24")
  await form.getByLabel("Start").fill("19:00")
  await form.getByLabel("End").fill("07:00")
  const sent = page.waitForRequest((req) => req.url().endsWith("/api/shifts") && req.method() === "POST")
  await page.getByTestId("agency-post-shift-submit-button").click()
  expect((await sent).postDataJSON()).toEqual({ role: "LPN", date: "2026-12-24", startTime: "19:00", endTime: "07:00" })
  await expectBanner(page, "Shift posted")
  await expect(card(page, "2026-12-24")).toContainText("19:00 to 07:00")
})

test("FR-2.10 start equal to end is stopped in the form, with no request", async ({ page }) => {
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  const form = page.getByRole("form", { name: "Post a shift" })
  await form.getByLabel("End").fill("07:00")
  let posted = false
  page.on("request", (req) => {
    if (req.url().endsWith("/api/shifts") && req.method() === "POST") posted = true
  })
  await page.getByTestId("agency-post-shift-submit-button").click()
  await expect(form.getByText("Start and end must differ")).toBeVisible()
  expect(posted).toBe(false)
})

test("FR-2.10 a failed post shows an error in the banner and keeps the form", async ({ page }) => {
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  await page.route("**/api/shifts", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()))
  await page.getByTestId("agency-post-shift-submit-button").click()
  await expectBanner(page, "Couldn't post shift, try again")
  await expect(page.getByTestId("agency-post-shift-submit-button")).toBeVisible()
})

test("FR-2.10 the form cannot be closed while a post is in flight, so its outcome is always reported", async ({
  page,
}) => {
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  let release = (): void => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  await page.route("**/api/shifts", async (route) => {
    if (route.request().method() !== "POST") return route.continue()
    await held
    await route.continue()
  })
  await page.getByTestId("agency-post-shift-submit-button").click()
  await expect(page.getByTestId("agency-post-shift-button")).toBeDisabled()
  release()
  await expectBanner(page, "Shift posted")
  await expect(page.getByTestId("agency-post-shift-button")).toBeEnabled()
})

test("FR-6.7 after an agency cancel, focus moves to the section heading", async ({ page }) => {
  await signInAs(page, "agency-a")
  await card(page, "2026-10-03").getByTestId("shift-cancel-button").click()
  await expectBanner(page, "Shift cancelled, now open")
  await expect(page.getByRole("heading", { name: "Your agency's shifts" })).toBeFocused()
})

test("FR-2.11 the screen lists only its own shifts with status and the covering nurse", async ({ page }) => {
  await signInAs(page, "agency-a")
  const cards = shiftsRegion(page).locator("article")
  await expect(cards).toHaveCount(2)
  await expect(card(page, "2026-10-02")).toContainText("open")
  await expect(card(page, "2026-10-03")).toContainText("filled")
  await expect(card(page, "2026-10-03")).toContainText("Covered by Maria Lopez")
  await expect(shiftsRegion(page)).not.toContainText("2026-10-04") // agency-b's shift-3
})

test("FR-2.11 a claim made elsewhere shows on the agency screen without a reload", async ({ page, request }) => {
  await signInAs(page, "agency-a")
  await expect(card(page, "2026-10-02")).toContainText("open")
  await request.post("/api/shifts/shift-1/claim", authed(await apiToken(request, "nurse-1")))
  await expect(card(page, "2026-10-02")).toContainText("Covered by Maria Lopez", POLL)
  await expect(page.getByTestId("shift-cancel-button")).toHaveCount(2, POLL)
})

test("FR-6.7 FR-6.8 one click cancels with the default reason advance and reopens the shift", async ({
  page,
  request,
  auditLog,
}) => {
  await signInAs(page, "agency-a")
  const sent = page.waitForRequest("**/api/shifts/shift-2/cancel")
  await card(page, "2026-10-03").getByTestId("shift-cancel-button").click()
  expect((await sent).postDataJSON()).toEqual({ reason: "advance" })
  await expectBanner(page, "Shift cancelled, now open")
  await expect(card(page, "2026-10-03")).toContainText("open")
  await expect(page.getByTestId("shift-cancel-button")).toHaveCount(0)
  expect((await agencyShifts(request)).find((x) => x.id === "shift-2")).toMatchObject({
    status: "open",
    claimedBy: null,
  })
  expect(await auditLog.entries("shift-2")).toEqual([
    {
      action: "shift.cancelled",
      actor_id: "agency-a",
      record_id: "shift-2",
      reason: "advance",
      previous_nurse_id: "nurse-1",
    },
  ])
})

test("FR-6.8 the agency chooses no-show beside the button", async ({ page, auditLog }) => {
  await signInAs(page, "agency-a")
  const filled = card(page, "2026-10-03")
  await expect(filled.getByRole("combobox", { name: "Reason" })).toContainText("Cancelled in advance")
  await filled.getByRole("combobox", { name: "Reason" }).click()
  await page.getByRole("option", { name: "No-show" }).click()
  const sent = page.waitForRequest("**/api/shifts/shift-2/cancel")
  await filled.getByTestId("shift-cancel-button").click()
  expect((await sent).postDataJSON()).toEqual({ reason: "no-show" })
  await expectBanner(page, "Shift cancelled, now open")
  expect((await auditLog.entries("shift-2"))[0]).toMatchObject({ reason: "no-show", previous_nurse_id: "nurse-1" })
})

test("FR-6.7 a cancel the server refuses shows its message in the banner", async ({ page, request }) => {
  await signInAs(page, "agency-a")
  const token = await apiToken(request, "nurse-1")
  // The nurse cancels first, while the agency's request is in flight, so the server answers the agency with 409.
  await page.route("**/api/shifts/shift-2/cancel", async (route) => {
    await request.post("/api/shifts/shift-2/cancel", { ...authed(token), data: { reason: "advance" } })
    await route.continue()
  })
  await card(page, "2026-10-03").getByTestId("shift-cancel-button").click()
  await expectBanner(page, "Shift is already open")
  await expect(card(page, "2026-10-03")).toContainText("open", POLL)
})

test("FR-9.3 agency-b's timesheet-table is empty at seed", async ({ page }) => {
  await signInAs(page, "agency-b")
  const table = page.getByTestId("timesheet-table")
  await expect(table).toBeVisible()
  await expect(page.getByRole("region", { name: "Scheduled hours" }).getByText("No scheduled hours yet")).toBeVisible()
})

test("FR-9.3 agency-a's timesheet-table lists shift-2 only", async ({ page }) => {
  await signInAs(page, "agency-a")
  const rows = page.getByTestId("timesheet-table").locator("tbody tr")
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText("Maria Lopez")
  await expect(rows.first()).toContainText("Sunrise Health Staffing")
})
