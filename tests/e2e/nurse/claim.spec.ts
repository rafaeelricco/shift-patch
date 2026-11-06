import type { APIRequestContext, Page, Route } from "@playwright/test"

import { Id } from "@lib/id"
import * as s from "@lib/json/schema"
import { api, type Shift } from "@api/endpoints"
import { DateOnly } from "@lib/time"

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
  seededShift,
  type AccountId,
} from "../fixtures"

const ERROR = s.object({ error: s.string })
const keys = async (res: { json: () => Promise<unknown> }) => {
  const body = await res.json()
  return typeof body === "object" && body !== null ? Object.keys(body).sort() : []
}
const SHIFT_KEYS = ["id", "agencyId", "agencyName", "role", "date", "startTime", "endTime", "status", "claimedBy"]
const EXPIRED = { error: "Credential expired, cannot claim shift" }

const open = (page: Page) => page.getByRole("region", { name: "Open shifts" })
const mine = (page: Page) => page.getByRole("region", { name: "Your shifts" })
const banner = (page: Page) => notification(page)
const card = (page: Page, date: string) => open(page).getByTestId("shift-list-item").filter({ hasText: date })

const claim = async (request: APIRequestContext, id: AccountId | null, shiftId: string) =>
  request.post(`/api/shifts/${shiftId}/claim`, id === null ? {} : authed(await apiToken(request, id)))

async function shifts(request: APIRequestContext, id: AccountId): Promise<ReadonlyArray<Shift>> {
  const res = await request.get("/api/shifts", authed(await apiToken(request, id)))
  expect(res.status()).toBe(200)
  return (await decoded(res, api.listShifts.response)).shifts
}

async function shiftIn(request: APIRequestContext, id: AccountId, shiftId: string): Promise<Shift | undefined> {
  return (await shifts(request, id)).find((x) => x.id.value === shiftId)
}

async function expectBanner(page: Page, text: string): Promise<void> {
  await expect(banner(page)).toHaveCount(1)
  await expect(banner(page).locator("[data-title]")).toHaveText(text)
}

/** Serves `GET /api/shifts` rewritten by `edit` until the first claim request goes out. */
async function rewriteListUntilClaim(page: Page, edit: (xs: ReadonlyArray<Shift>) => ReadonlyArray<Shift>) {
  let rewrite = true
  page.on("request", (r) => {
    if (r.url().endsWith("/claim")) rewrite = false
  })
  await page.route("**/api/shifts", async (route) => {
    if (!rewrite) return route.continue()
    const res = await route.fetch()
    const { shifts: xs } = await decoded(res, api.listShifts.response)
    await route.fulfill({ response: res, json: s.encode(api.listShifts.response, { shifts: [...edit(xs)] }) })
  })
}

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-3.3 an eligible nurse claims with an empty body and gets the filled shift", async ({ request, auditLog }) => {
  const res = await claim(request, "nurse-1", "shift-1")
  expect(res.status()).toBe(200)
  expect(await keys(res)).toEqual([...SHIFT_KEYS].sort())
  const filled = { ...seededShift("shift-1"), status: "filled", claimedBy: new Id<"User">("nurse-1") }
  expect(await decoded(res, api.claimShift.response)).toEqual(filled)
  expect(await shiftIn(request, "agency-a", "shift-1")).toEqual(filled)
  expect(await shiftIn(request, "admin-1", "shift-1")).toEqual(filled)
  expect(await auditLog.entries("shift-1")).toEqual([
    { action: "shift.claimed", actor_id: "nurse-1", record_id: "shift-1", reason: null, previous_nurse_id: null },
  ])
})

test("FR-3.4 claiming a filled shift is 409 { error: 'Shift already filled' } with no audit entry", async ({
  request,
  auditLog,
}) => {
  const res = await claim(request, "nurse-1", "shift-2")
  expect(res.status()).toBe(409)
  expect(await decoded(res, ERROR)).toEqual({ error: "Shift already filled" })
  expect(await keys(res)).toEqual(["error"])
  expect(await auditLog.entries("shift-2")).toEqual([])
})

test("FR-3.4 an unknown shift is 404 { error: 'Shift not found' }", async ({ request }) => {
  for (const id of ["nurse-1", "nurse-2"] as const) {
    const res = await claim(request, id, "shift-404")
    expect(res.status(), id).toBe(404)
    expect(await decoded(res, ERROR)).toEqual({ error: "Shift not found" })
  }
})

test("FR-3.4 agency and admin callers get 403 and the shift is unchanged", async ({ request }) => {
  for (const id of ["agency-a", "agency-b", "admin-1"] as const) {
    const res = await claim(request, id, "shift-1")
    expect(res.status(), id).toBe(403)
    expect(await decoded(res, ERROR)).toEqual({ error: "You don't have access to this" })
  }
  expect(await shiftIn(request, "admin-1", "shift-1")).toEqual(seededShift("shift-1"))
})

test("FR-3.5 simultaneous claims: exactly one 200, the rest 409", async ({ request, auditLog }) => {
  await setExpiry("nurse-2", relativeDate(365))
  const tokens = {
    "nurse-1": await apiToken(request, "nurse-1"),
    "nurse-2": await apiToken(request, "nurse-2"),
  }
  const ids = Array.from({ length: 10 }, (_, i) => `shift-${9001 + i}`)
  for (const id of ids) {
    await insertShift({
      id,
      agencyId: "agency-a",
      role: "RN",
      date: relativeDate(7),
      startTime: "07:00",
      endTime: "19:00",
      claimedBy: null,
    })
  }
  for (const id of ids) {
    const claimers = ["nurse-1", "nurse-1", "nurse-1", "nurse-2", "nurse-2", "nurse-2"] as const
    const replies = await Promise.all(
      claimers.map(async (nurse) => {
        const res = await request.post(`/api/shifts/${id}/claim`, authed(tokens[nurse]))
        return { nurse, status: res.status(), res }
      })
    )
    const won = replies.filter((r) => r.status === 200)
    const lost = replies.filter((r) => r.status === 409)
    expect(won, id).toHaveLength(1)
    expect(lost, id).toHaveLength(5)
    for (const r of lost) expect(await decoded(r.res, ERROR)).toEqual({ error: "Shift already filled" })
    const winner = won[0]?.nurse
    expect((await shiftIn(request, "admin-1", id))?.claimedBy?.value).toBe(winner)
    const entries = await auditLog.entries(id)
    expect(entries.filter((e) => e.action === "shift.claimed")).toEqual([
      { action: "shift.claimed", actor_id: winner, record_id: id, reason: null, previous_nurse_id: null },
    ])
  }
})

test("FR-3.6 a UI claim shows Shift claimed and moves the card to Your shifts without a reload", async ({
  page,
  browser,
  request,
}) => {
  await signInAs(page, "nurse-1")
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2)
  await page.evaluate(() => {
    ;(window as Window & { claimMarker?: number }).claimMarker = 1
  })
  await card(page, "2026-10-02").getByTestId("shift-claim-button").click()
  await expectBanner(page, "Shift claimed")
  await expect(open(page).getByTestId("shift-list-item")).toHaveCount(1)
  const claimed = mine(page).locator("article").filter({ hasText: "2026-10-02" })
  await expect(claimed).toHaveCount(1)
  await expect(claimed.getByTestId("shift-cancel-button")).toBeVisible()
  // The same document: a navigation would have dropped the marker.
  expect(await page.evaluate(() => (window as Window & { claimMarker?: number }).claimMarker)).toBe(1)
  await expect(banner(page)).toHaveCount(0, { timeout: 6000 })

  await page.reload()
  await expect(mine(page).locator("article").filter({ hasText: "2026-10-02" })).toHaveCount(1)

  const other = await browser.newContext()
  const james = await other.newPage()
  await signInAs(james, "nurse-2")
  await expect(open(james).getByTestId("shift-list-item")).toHaveCount(1)
  await other.close()

  const shift = await shiftIn(request, "admin-1", "shift-1")
  expect(shift?.status).toBe("filled")
  expect(shift?.claimedBy?.value).toBe("nurse-1")
})

test("FR-3.6 a double click sends one claim request", async ({ page }) => {
  let claims = 0
  page.on("request", (r) => {
    if (r.url().endsWith("/claim")) claims += 1
  })
  await signInAs(page, "nurse-1")
  await card(page, "2026-10-02").getByTestId("shift-claim-button").dblclick()
  await expectBanner(page, "Shift claimed")
  expect(claims).toBe(1)
})

test("FR-3.6 a lost race shows Shift already filled and the list corrects itself", async ({ page }) => {
  await rewriteListUntilClaim(page, (xs) =>
    xs.map((x) => (x.id.value === "shift-2" ? { ...x, status: "open", claimedBy: null } : x))
  )
  await signInAs(page, "nurse-1")
  await card(page, "2026-10-03").getByTestId("shift-claim-button").click()
  await expectBanner(page, "Shift already filled")
  await expect(card(page, "2026-10-03")).toHaveCount(0)
})

test("FR-3.6 a removed shift shows Shift not found and the list re-reads", async ({ page }) => {
  const ghost: Shift = { ...seededShift("shift-1"), id: new Id<"Shift">("shift-9999"), date: "2026-10-05" }
  await rewriteListUntilClaim(page, (xs) => [...xs, ghost])
  await signInAs(page, "nurse-1")
  await card(page, "2026-10-05").getByTestId("shift-claim-button").click()
  await expectBanner(page, "Shift not found")
  await expect(card(page, "2026-10-05")).toHaveCount(0)
})

test("FR-3.6 a network failure or 5xx shows a retry line and keeps the card", async ({ page }) => {
  await signInAs(page, "nurse-1")
  const button = card(page, "2026-10-02").getByTestId("shift-claim-button")
  const attempts: ReadonlyArray<(route: Route) => Promise<void>> = [
    (route) => route.abort(),
    (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: '{"error":"Something went wrong, try again"}',
      }),
    (route) => route.fulfill({ status: 502, contentType: "text/plain", body: "Bad Gateway" }),
  ]
  for (const handler of attempts) {
    await page.route("**/claim", handler)
    await Promise.all([page.waitForRequest("**/claim"), button.click()])
    await expectBanner(page, "Couldn't claim shift, try again")
    await expect(open(page).getByTestId("shift-list-item")).toHaveCount(2)
    await page.unroute("**/claim")
  }
})

test("FR-4.1 nurse-2 gets 403 with exactly the expired-credential body and the shift does not change", async ({
  request,
  auditLog,
}) => {
  const res = await claim(request, "nurse-2", "shift-1")
  expect(res.status()).toBe(403)
  expect(await decoded(res, ERROR)).toEqual(EXPIRED)
  expect(await keys(res)).toEqual(["error"])
  const shift = await shiftIn(request, "admin-1", "shift-1")
  expect(shift?.status).toBe("open")
  expect(shift?.claimedBy).toBeNull()
  expect(await auditLog.entries("shift-1")).toEqual([
    { action: "claim.blocked", actor_id: "nurse-2", record_id: "shift-1", reason: null, previous_nurse_id: null },
  ])
})

test("FR-4.2 James's claim button stays visible and enabled and the banner shows the exact message", async ({
  page,
}) => {
  let claims = 0
  page.on("request", (r) => {
    if (r.url().endsWith("/claim")) claims += 1
  })
  await signInAs(page, "nurse-2")
  const note = open(page).getByText(
    "Your credential expired on 2026-06-01, so claims will be refused. Submit a renewal under Credential."
  )
  await expect(note).toBeVisible()
  const target = card(page, "2026-10-02")
  const noteBox = await note.boundingBox()
  const cardBox = await target.boundingBox()
  expect(noteBox !== null && cardBox !== null && noteBox.y < cardBox.y).toBe(true)

  const button = target.getByTestId("shift-claim-button")
  await button.click()
  await expectBanner(page, EXPIRED.error)
  await expect(button).toBeVisible()
  await expect(button).toBeEnabled()
  await expect(target).toHaveCount(1)
  const renewal = page.getByRole("button", { name: "Upload renewal" })
  await expect(renewal).toBeVisible()
  await expect(banner(page).getByRole("button", { name: "Upload renewal" })).toHaveCount(1)
  await page.getByRole("button", { name: "Upload a renewal", exact: true }).click()
  await expect(page.getByTestId("credential-upload-input")).toBeHidden()
  await renewal.click()
  await expect(page.getByTestId("credential-upload-input")).toBeFocused()

  await Promise.all([page.waitForResponse("**/claim"), button.click()])
  await expectBanner(page, EXPIRED.error)
  expect(claims).toBe(2)
})

test("FR-4.3 the credential check runs before the status check", async ({ request }) => {
  const res = await claim(request, "nurse-2", "shift-2")
  expect(res.status()).toBe(403)
  expect(await decoded(res, ERROR)).toEqual(EXPIRED)
})

test("FR-4.4 the expiry date itself counts as valid", async ({ request }) => {
  await setExpiry("nurse-1", relativeDate(0))
  const date = relativeDate(-30)
  await insertShift({
    id: "shift-9001",
    agencyId: "agency-a",
    role: "RN",
    date,
    startTime: "07:00",
    endTime: "19:00",
    claimedBy: null,
  })
  expect((await claim(request, "nurse-1", "shift-9001")).status()).toBe(200)
})

test("FR-4.4 an expiry before today blocks even a past shift", async ({ request }) => {
  await setExpiry("nurse-1", relativeDate(-1))
  const res = await claim(request, "nurse-1", "shift-1")
  expect(res.status()).toBe(403)
  expect(await decoded(res, ERROR)).toEqual(EXPIRED)
})

test("FR-4.4 a day shift ending on the expiry date can be claimed", async ({ request }) => {
  await setExpiry("nurse-1", relativeDate(30))
  const date = relativeDate(30)
  await insertShift({
    id: "shift-9001",
    agencyId: "agency-a",
    role: "RN",
    date,
    startTime: "07:00",
    endTime: "19:00",
    claimedBy: null,
  })
  expect((await claim(request, "nurse-1", "shift-9001")).status()).toBe(200)
})

test("FR-4.4 an overnight shift ending the day after expiry is blocked", async ({ page, request }) => {
  await setExpiry("nurse-1", relativeDate(30))
  const date = relativeDate(30)
  await insertShift({
    id: "shift-9001",
    agencyId: "agency-a",
    role: "RN",
    date,
    startTime: "19:00",
    endTime: "07:00",
    claimedBy: null,
  })
  await signInAs(page, "nurse-1")
  const target = card(page, `${date}, 19:00 to 07:00`)
  await expect(target.getByText("Ends after your credential expires")).toBeVisible()
  await target.getByTestId("shift-claim-button").click()
  await expectBanner(page, EXPIRED.error)
  const res = await claim(request, "nurse-1", "shift-9001")
  expect(res.status()).toBe(403)
  expect(await decoded(res, ERROR)).toEqual(EXPIRED)
})

test("FR-4.4 an overnight shift ending on the expiry date can be claimed", async ({ request }) => {
  await setExpiry("nurse-1", relativeDate(31))
  const date = relativeDate(30)
  await insertShift({
    id: "shift-9001",
    agencyId: "agency-a",
    role: "RN",
    date,
    startTime: "19:00",
    endTime: "07:00",
    claimedBy: null,
  })
  expect((await claim(request, "nurse-1", "shift-9001")).status()).toBe(200)
})

test("FR-4.5 nurse-1 can claim the seeded shift-1 although its date has passed", async ({ request }) => {
  test.skip(DateOnly.todayUTC().pretty() > "2027-01-01", "Maria's seeded credential (2027-01-01) has lapsed")
  await setExpiry("nurse-1", "2027-01-01")
  const res = await claim(request, "nurse-1", "shift-1")
  expect(res.status()).toBe(200)
  expect((await decoded(res, api.claimShift.response)).status).toBe("filled")
  expect((await shiftIn(request, "admin-1", "shift-1"))?.status).toBe("filled")
})

test("FR-4.6 eligibility ignores role: one nurse claims an RN and an LPN shift", async ({ request }) => {
  await insertShift({
    id: "shift-9001",
    agencyId: "agency-b",
    role: "LPN",
    date: relativeDate(7),
    startTime: "07:00",
    endTime: "19:00",
    claimedBy: null,
  })
  const rn = await claim(request, "nurse-1", "shift-1")
  expect(rn.status()).toBe(200)
  expect((await decoded(rn, api.claimShift.response)).role).toBe("RN")
  const lpn = await claim(request, "nurse-1", "shift-9001")
  expect(lpn.status()).toBe(200)
  expect((await decoded(lpn, api.claimShift.response)).role).toBe("LPN")
})
