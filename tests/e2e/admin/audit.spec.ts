import type { APIRequestContext, Page } from "@playwright/test"

import { api } from "@api/endpoints"
import { Id } from "@lib/id"

import { test, expect, signInAs, apiToken, authed, decoded, setExpiry, relativeDate, type AccountId } from "../fixtures"

const POLL = { timeout: 5_000 }
const TIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/

const table = (page: Page) => page.getByTestId("audit-log-table")
const firstRow = (page: Page) => table(page).locator("tbody tr").first()

async function entries(request: APIRequestContext) {
  const res = await request.get("/api/admin/audit", authed(await apiToken(request, "admin-1")))
  expect(res.status()).toBe(200)
  return (await decoded(res, api.auditLog.response)).entries
}

async function post(request: APIRequestContext, id: AccountId, path: string, data: object) {
  const res = await request.post(path, { ...authed(await apiToken(request, id)), data })
  expect(res.status()).toBe(200)
}

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-6.6 an agency no-show cancel shows the reason and previous nurse in audit-log-table", async ({
  page,
  request,
  auditLog,
}) => {
  await signInAs(page, "admin-1")
  await expect(table(page)).toBeVisible()
  const headers = (await table(page).locator("thead th").allInnerTexts()).map((h) => h.trim())
  expect(headers).toEqual(["Time", "Actor", "Action", "Record", "Reason", "Previous nurse"])

  await post(request, "agency-a", "/api/shifts/shift-2/cancel", { reason: "no-show" })
  expect(await auditLog.entries("shift-2")).toEqual([
    {
      action: "shift.cancelled",
      actor_id: "agency-a",
      record_id: "shift-2",
      reason: "no-show",
      previous_nurse_id: "nurse-1",
    },
  ])
  await expect(firstRow(page).locator("td")).toHaveText(
    [TIME, "Sunrise Health Staffing", "shift.cancelled", "shift-2", "no-show", "Maria Lopez"],
    POLL
  )
})

test("FR-8.1 GET /api/admin/audit lists entries newest first with names resolved", async ({ request }) => {
  await post(request, "nurse-1", "/api/shifts/shift-1/claim", {})
  await post(request, "nurse-1", "/api/shifts/shift-1/cancel", { reason: "advance" })
  const list = await entries(request)
  expect(list[0]).toMatchObject({
    actorId: new Id<"User">("nurse-1"),
    actorName: "Maria Lopez",
    action: "shift.cancelled",
    recordId: "shift-1",
    reason: "advance",
    previousNurseId: new Id<"User">("nurse-1"),
    previousNurseName: "Maria Lopez",
  })
  expect(list[1]).toMatchObject({
    action: "shift.claimed",
    recordId: "shift-1",
    reason: null,
    previousNurseId: null,
    previousNurseName: null,
  })
  for (let i = 1; i < list.length; i++) {
    const [newer, older] = [list[i - 1], list[i]]
    if (newer !== undefined && older !== undefined) expect(newer.at.compare(older.at)).toBeGreaterThanOrEqual(0)
  }
})

test("FR-8.1 the seed reset entry reads System as its actor", async ({ page, request }) => {
  // The auto `seeded` fixture reset the data before this test, so the newest entry is that reset.
  const [latest] = await entries(request)
  expect(latest).toMatchObject({ actorId: null, actorName: null, action: "seed.reset", recordId: "seed" })
  await signInAs(page, "admin-1")
  await expect(firstRow(page).locator("td")).toHaveText([TIME, "System", "seed.reset", "seed", "—", "—"])
})

for (const id of ["nurse-1", "agency-a"] as const) {
  test(`FR-8.1 audit-log-table never renders for ${id}`, async ({ page }) => {
    await signInAs(page, id) // waits for that role's landing screen
    await expect(page.getByTestId("audit-log-table")).toHaveCount(0)
  })
}
