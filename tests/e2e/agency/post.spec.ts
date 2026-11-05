import type { APIRequestContext } from "@playwright/test"

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { resetToSeed } from "@lib/seed"

import { test, expect, apiToken, authed, decoded, relativeDate, setExpiry, type AccountId } from "../fixtures"

const ERROR = s.object({ error: s.string })
const keys = async (res: { json: () => Promise<unknown> }) => {
  const body = await res.json()
  return typeof body === "object" && body !== null ? Object.keys(body).sort() : []
}
const SHIFT_KEYS = ["id", "agencyId", "agencyName", "role", "date", "startTime", "endTime", "status", "claimedBy"]
const FORBIDDEN = { error: "You don't have access to this" }
const INVALID = { error: "Shift needs role RN or LPN, a real YYYY-MM-DD date, and different HH:mm start and end times" }
const EXAMPLE = { role: "RN", date: "2026-10-05", startTime: "07:00", endTime: "19:00" }

/** `body` a string is sent raw. */
async function post(request: APIRequestContext, id: AccountId, body: unknown) {
  return request.post("/api/shifts", { ...authed(await apiToken(request, id)), data: body })
}

async function posted(request: APIRequestContext, id: AccountId, body: unknown) {
  const res = await post(request, id, body)
  expect(res.status()).toBe(201)
  return decoded(res, api.postShift.response)
}

const shiftNumber = (id: string): number => Number(/^shift-(\d+)$/.exec(id)?.[1] ?? Number.NaN)

test("FR-2.1 an agency posts { role, date, startTime, endTime } and gets 201 with the full open shift", async ({
  request,
}) => {
  const res = await post(request, "agency-a", EXAMPLE)
  expect(res.status()).toBe(201)
  expect((await keys(res)).sort()).toEqual([...SHIFT_KEYS].sort())
  const shift = await decoded(res, api.postShift.response)
  expect(shift.id).toMatch(/^shift-\d+$/)
  expect(shift).toEqual({
    ...EXAMPLE,
    id: shift.id,
    agencyId: "agency-a",
    agencyName: "Sunrise Health Staffing",
    status: "open",
    claimedBy: null,
  })
  // It is a real row: every reader sees it.
  const all = await request.get("/api/shifts", authed(await apiToken(request, "nurse-1")))
  expect((await decoded(all, api.listShifts.response)).shifts).toContainEqual(shift)
})

test("FR-2.2 an agencyId in the body has no effect", async ({ request }) => {
  const shift = await posted(request, "agency-b", { ...EXAMPLE, agencyId: "agency-a", agencyName: "Sunrise" })
  expect(shift.agencyId).toBe("agency-b")
  expect(shift.agencyName).toBe("Metro Care Partners")
})

for (const id of ["nurse-1", "nurse-2", "admin-1"] as const) {
  test(`FR-2.3 ${id} gets 403 { error: "You don't have access to this" } and nothing is posted`, async ({
    request,
    auditLog,
  }) => {
    const before = (
      await decoded(await request.get("/api/shifts", authed(await apiToken(request, id))), api.listShifts.response)
    ).shifts
    const res = await post(request, id, EXAMPLE)
    expect(res.status()).toBe(403)
    expect(await decoded(res, ERROR)).toEqual(FORBIDDEN)
    const after = (
      await decoded(await request.get("/api/shifts", authed(await apiToken(request, id))), api.listShifts.response)
    ).shifts
    expect(after).toEqual(before)
    expect(await auditLog.entries()).toEqual([])
  })
}

test("FR-2.3 a non-agency gets 403 even with an invalid body (403 before 400)", async ({ request }) => {
  const res = await post(request, "nurse-1", { role: "CNA" })
  expect(res.status()).toBe(403)
  expect(await decoded(res, ERROR)).toEqual(FORBIDDEN)
})

const INVALID_BODIES: ReadonlyArray<[string, unknown]> = [
  ["role CNA", { ...EXAMPLE, role: "CNA" }],
  ["lowercase role", { ...EXAMPLE, role: "rn" }],
  ["date 2026-02-30 (not a real day)", { ...EXAMPLE, date: "2026-02-30" }],
  ["date 10/05/2026", { ...EXAMPLE, date: "10/05/2026" }],
  ["date 2026-10-5", { ...EXAMPLE, date: "2026-10-5" }],
  ["date 0000-01-01 (Postgres has no year zero)", { ...EXAMPLE, date: "0000-01-01" }],
  ["startTime 7:00", { ...EXAMPLE, startTime: "7:00" }],
  ["startTime 24:00", { ...EXAMPLE, startTime: "24:00" }],
  ["endTime 19:60", { ...EXAMPLE, endTime: "19:60" }],
  ["endTime 7pm", { ...EXAMPLE, endTime: "7pm" }],
  ["startTime with seconds", { ...EXAMPLE, startTime: "07:00:00" }],
  ["start equals end", { ...EXAMPLE, endTime: "07:00" }],
  ["missing role", { date: EXAMPLE.date, startTime: EXAMPLE.startTime, endTime: EXAMPLE.endTime }],
  ["numeric date", { ...EXAMPLE, date: 20261005 }],
  ["empty object", {}],
  ["an array", [EXAMPLE]],
  ["not JSON", "role=RN"],
]

for (const [label, body] of INVALID_BODIES) {
  test(`FR-2.4 ${label} gets 400 { error } and writes nothing`, async ({ request, auditLog }) => {
    const res = await post(request, "agency-a", body)
    expect(res.status()).toBe(400)
    expect(await keys(res)).toEqual(["error"])
    expect(await decoded(res, ERROR)).toEqual(INVALID)
    expect(await auditLog.entries()).toEqual([])
  })
}

test("FR-2.4 a leap day is a real date", async ({ request }) => {
  const shift = await posted(request, "agency-a", { ...EXAMPLE, date: "2028-02-29" })
  expect(shift.date).toBe("2028-02-29")
})

test("FR-2.5 a date in the past is accepted", async ({ request }) => {
  const date = relativeDate(-30)
  const shift = await posted(request, "agency-a", { ...EXAMPLE, date })
  expect(shift.date).toBe(date)
})

test("FR-2.6 an endTime earlier than startTime is accepted as overnight, and scheduled as 12 hours", async ({
  request,
}) => {
  const shift = await posted(request, "agency-a", {
    role: "LPN",
    date: "2026-10-05",
    startTime: "19:00",
    endTime: "07:00",
  })
  expect(shift).toMatchObject({ role: "LPN", startTime: "19:00", endTime: "07:00", status: "open" })
  await setExpiry("nurse-1", relativeDate(365))
  const claim = await request.post(`/api/shifts/${shift.id}/claim`, authed(await apiToken(request, "nurse-1")))
  expect(claim.status()).toBe(200)
  const res = await request.get("/api/timesheet", authed(await apiToken(request, "agency-a")))
  const row = (await decoded(res, api.timesheet.response)).rows.find((r) => r.shiftId === shift.id)
  expect(row?.hours).toBe(12)
})

test("FR-2.7 each post gets a new shift-<n> ID that is never reused, even after a seed reset", async ({ request }) => {
  const first = await posted(request, "agency-a", EXAMPLE)
  const second = await posted(request, "agency-b", EXAMPLE)
  expect(shiftNumber(first.id)).toBeGreaterThan(3)
  expect(shiftNumber(second.id)).toBeGreaterThan(shiftNumber(first.id))
  await resetToSeed().promise((e) => new Error(e.message))
  const third = await posted(request, "agency-a", EXAMPLE)
  expect(shiftNumber(third.id)).toBeGreaterThan(shiftNumber(second.id))
})

test("FR-2.7 concurrent posts get distinct IDs", async ({ request }) => {
  const token = await apiToken(request, "agency-a")
  const replies = await Promise.all(
    Array.from({ length: 5 }, () => request.post("/api/shifts", { ...authed(token), data: EXAMPLE }))
  )
  const ids = await Promise.all(
    replies.map(async (res) => {
      expect(res.status()).toBe(201)
      return (await decoded(res, api.postShift.response)).id
    })
  )
  expect(new Set(ids).size).toBe(5)
})

test("FR-8.2 posting writes one shift.posted entry by the agency", async ({ request, auditLog }) => {
  const shift = await posted(request, "agency-a", EXAMPLE)
  expect(await auditLog.entries(shift.id)).toEqual([
    { action: "shift.posted", actor_id: "agency-a", record_id: shift.id, reason: null, previous_nurse_id: null },
  ])
})
