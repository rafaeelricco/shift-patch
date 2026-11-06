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
  // Design canvas: the default day is tomorrow, so two clicks post a shift nobody has to fix.
  expect(body).toEqual({ role: "RN", date: relativeDate(1), startTime: "07:00", endTime: "19:00" })
  await expectBanner(page, `Shift posted: RN, ${relativeDate(1)}, 07:00 to 19:00`)
  await expect(page.getByTestId("agency-post-shift-submit-button")).toHaveCount(0)
  await expect(card(page, relativeDate(1))).toContainText("RN")
  await expect(card(page, relativeDate(1))).toContainText("open")
  await expect(page.getByTestId("agency-post-shift-button")).toBeFocused()
  expect((await agencyShifts(request)).map((x) => x.date)).toContain(relativeDate(1))
})

test("FR-2.10 the form posts edited values, including an overnight shift", async ({ page }) => {
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  const form = page.getByRole("form", { name: "Post a shift" })
  const day = relativeDate(3)
  await form.getByRole("radiogroup", { name: "Role" }).getByRole("radio", { name: "LPN" }).check()
  await form.getByRole("radio", { name: new RegExp(`^${day},`) }).check()
  await form
    .getByRole("radiogroup", { name: "Hours" })
    .getByRole("radio", { name: /^Custom/ })
    .check()
  // Typed shorthand becomes HH:mm on blur (design canvas).
  await form.getByLabel("Start").fill("1900")
  await form.getByLabel("End").fill("7")
  await form.getByLabel("End").blur()
  await expect(form.getByLabel("End")).toHaveValue("07:00")
  await expect(form).toContainText("19:00 to 07:00 next day, 12 scheduled hours")
  const sent = page.waitForRequest((req) => req.url().endsWith("/api/shifts") && req.method() === "POST")
  await page.getByTestId("agency-post-shift-submit-button").click()
  expect((await sent).postDataJSON()).toEqual({ role: "LPN", date: day, startTime: "19:00", endTime: "07:00" })
  await expectBanner(page, `Shift posted: LPN, ${day}, 19:00 to 07:00`)
  await expect(card(page, day)).toContainText("19:00 to 07:00 next day")
})

test("FR-2.10 Enter posts custom shorthand without leaving the time field", async ({ page }) => {
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  const form = page.getByRole("form", { name: "Post a shift" })
  await form
    .getByRole("radiogroup", { name: "Hours" })
    .getByRole("radio", { name: /^Custom/ })
    .check()
  await form.getByLabel("Start").fill("1900")
  const end = form.getByLabel("End")
  await end.fill("7")
  await expect(end).toHaveValue("7")
  await expect(end).toBeFocused()
  await expect(form).toContainText("19:00 to 07:00 next day, 12 scheduled hours")

  const sent = page.waitForRequest((req) => req.url().endsWith("/api/shifts") && req.method() === "POST")
  await end.press("Enter")
  expect((await sent).postDataJSON()).toEqual({ role: "RN", date: relativeDate(1), startTime: "19:00", endTime: "07:00" })
  await expectBanner(page, `Shift posted: RN, ${relativeDate(1)}, 19:00 to 07:00`)
})

test("FR-2.10 start equal to end is stopped in the form, with no request", async ({ page }) => {
  await signInAs(page, "agency-a")
  await page.getByTestId("agency-post-shift-button").click()
  const form = page.getByRole("form", { name: "Post a shift" })
  await form
    .getByRole("radiogroup", { name: "Hours" })
    .getByRole("radio", { name: /^Custom/ })
    .check()
  await form.getByLabel("End").fill("07:00")
  let posted = false
  page.on("request", (req) => {
    if (req.url().endsWith("/api/shifts") && req.method() === "POST") posted = true
  })
  await page.getByTestId("agency-post-shift-submit-button").click()
  await expect(form.getByText("Start and end times must differ")).toBeVisible()
  await expect(form.getByLabel("End")).toBeFocused()
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
  await expectBanner(page, `Shift posted: RN, ${relativeDate(1)}, 07:00 to 19:00`)
  await expect(page.getByTestId("agency-post-shift-button")).toBeEnabled()
})

test("FR-6.7 after an agency cancel, focus stays on that shift's row", async ({ page }) => {
  await signInAs(page, "agency-a")
  await card(page, "2026-10-03").getByTestId("shift-cancel-button").click()
  await expectBanner(page, "Shift cancelled, now open")
  await expect(card(page, "2026-10-03")).toContainText("No nurse yet")
  await expect(card(page, "2026-10-03")).toBeFocused()
})

test("FR-6.7 after an agency cancel hides the shift, focus returns to the Filled filter", async ({ page }) => {
  await signInAs(page, "agency-a")
  const filter = shiftsRegion(page)
    .getByRole("radiogroup", { name: "Filter shifts by status" })
    .getByRole("radio", { name: "Filled", exact: true })
  await filter.check()
  const shift = card(page, "2026-10-03")
  await shift.getByRole("button", { name: "Choose a cancellation reason" }).press("Enter")
  await page.getByRole("menuitem", { name: /No-show/ }).press("Enter")
  await expectBanner(page, "Shift cancelled, now open")
  await expect(shift).toHaveCount(0)
  await expect(filter).toBeChecked()
  await expect(filter).toBeFocused()
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

test("FR-6.8 the agency records a no-show from the menu beside the button", async ({ page, auditLog }) => {
  await signInAs(page, "agency-a")
  const filled = card(page, "2026-10-03")
  await filled.getByRole("button", { name: "Choose a cancellation reason" }).click()
  await expect(page.getByRole("menuitem", { name: /Cancelled in advance/ })).toBeVisible()
  const sent = page.waitForRequest("**/api/shifts/shift-2/cancel")
  await page.getByRole("menuitem", { name: /No-show/ }).click()
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
