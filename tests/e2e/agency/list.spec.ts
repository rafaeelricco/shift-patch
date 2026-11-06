import type { APIRequestContext } from "@playwright/test"

import { Id } from "@lib/id"
import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"

import { test, expect, apiToken, authed, decoded, seededShift, type AccountId } from "../fixtures"

const ERROR = s.object({ error: s.string })
const keys = async (res: { json: () => Promise<unknown> }) => {
  const body = await res.json()
  return typeof body === "object" && body !== null ? Object.keys(body).sort() : []
}
const FORBIDDEN = { error: "You don't have access to this" }

async function read(request: APIRequestContext, id: AccountId, agencyId: string) {
  return request.get(`/api/agencies/${agencyId}/shifts`, authed(await apiToken(request, id)))
}

test("FR-2.8 agency-a reads its own shifts as { agencyId, shifts } in the full shift shape", async ({ request }) => {
  const res = await read(request, "agency-a", "agency-a")
  expect(res.status()).toBe(200)
  expect(await keys(res)).toEqual(["agencyId", "shifts"])
  expect(await decoded(res, api.agencyShifts.response)).toEqual({
    agencyId: new Id<"User">("agency-a"),
    shifts: [seededShift("shift-1"), seededShift("shift-2")],
  })
})

test("FR-2.8 agency-b reads only shift-3", async ({ request }) => {
  const res = await read(request, "agency-b", "agency-b")
  expect(res.status()).toBe(200)
  expect(await decoded(res, api.agencyShifts.response)).toEqual({
    agencyId: new Id<"User">("agency-b"),
    shifts: [seededShift("shift-3")],
  })
})

test("FR-2.8 a posted shift appears only in its own agency's list", async ({ request }) => {
  const res = await request.post("/api/shifts", {
    ...authed(await apiToken(request, "agency-b")),
    data: { role: "LPN", date: "2026-10-06", startTime: "07:00", endTime: "15:00" },
  })
  const shift = await decoded(res, api.postShift.response)
  const own = await decoded(await read(request, "agency-b", "agency-b"), api.agencyShifts.response)
  const other = await decoded(await read(request, "agency-a", "agency-a"), api.agencyShifts.response)
  expect(own.shifts.map((x) => x.id.value)).toEqual(["shift-3", shift.id.value])
  expect(other.shifts.map((x) => x.id.value)).toEqual(["shift-1", "shift-2"])
})

const DENIED: ReadonlyArray<[AccountId, string]> = [
  ["agency-b", "agency-a"],
  ["agency-a", "agency-b"],
  ["agency-a", "agency-zzz"],
  ["nurse-1", "agency-a"],
  ["nurse-2", "agency-b"],
]
for (const [who, agencyId] of DENIED) {
  test(`FR-2.9 ${who} reading ${agencyId} gets 403 { error: "You don't have access to this" }`, async ({ request }) => {
    const res = await read(request, who, agencyId)
    expect(res.status()).toBe(403)
    expect(await keys(res)).toEqual(["error"])
    expect(await decoded(res, ERROR)).toEqual(FORBIDDEN)
  })
}

test("FR-2.9 an admin may read any agency", async ({ request }) => {
  for (const [agencyId, ids] of [
    ["agency-a", ["shift-1", "shift-2"]],
    ["agency-b", ["shift-3"]],
  ] as const) {
    const res = await read(request, "admin-1", agencyId)
    expect(res.status()).toBe(200)
    const body = await decoded(res, api.agencyShifts.response)
    expect(body.agencyId.value).toBe(agencyId)
    expect(body.shifts.map((x) => x.id.value)).toEqual(ids)
  }
})

for (const agencyId of ["agency-zzz", "nurse-1", "admin-1"]) {
  test(`FR-2.9 an admin reading unknown agency ${agencyId} gets 404 { error }`, async ({ request }) => {
    const res = await read(request, "admin-1", agencyId)
    expect(res.status()).toBe(404)
    expect(await decoded(res, ERROR)).toEqual({ error: "Agency not found" })
  })
}
