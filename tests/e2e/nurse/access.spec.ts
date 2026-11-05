import { createHmac } from "node:crypto"

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql } from "@lib/db"

import { test, expect, signInAs, apiToken, authed, decoded, setExpiry, relativeDate } from "../fixtures"

const ERROR = s.object({ error: s.string })
const EXPIRED = { error: "Session expired, sign in again" }
const keys = async (res: { json: () => Promise<unknown> }) => {
  const body = await res.json()
  return typeof body === "object" && body !== null ? Object.keys(body).sort() : []
}

const b64 = (text: string) => Buffer.from(text).toString("base64url")
type Claims = { sub: string; role: string; name: string; iat: number; exp: number }

/** A JWT signed by hand with `node:crypto`, so the test controls every claim and the key. */
function hs256(payload: Claims, secret: string): string {
  const head = `${b64(JSON.stringify({ alg: "HS256", typ: "JWT" }))}.${b64(JSON.stringify(payload))}`
  return `${head}.${createHmac("sha256", secret).update(head).digest("base64url")}`
}

function algNone(payload: Claims): string {
  return `${b64(JSON.stringify({ alg: "none", typ: "JWT" }))}.${b64(JSON.stringify(payload))}.`
}

const now = () => Math.floor(Date.now() / 1000)
const maria = (): Claims => ({ sub: "nurse-1", role: "nurse", name: "Maria Lopez", iat: now(), exp: now() + 3600 })
const secret = (): string => {
  const value = process.env["JWT_SECRET"]
  if (value === undefined) throw new Error("JWT_SECRET is not set") // playwright.config.ts sets it
  return value
}

async function expect401(res: { status: () => number; json: () => Promise<unknown> }) {
  expect(res.status()).toBe(401)
  expect(await keys(res)).toEqual(["error"])
}

test.beforeEach(async () => {
  await setExpiry("nurse-1", relativeDate(365))
})

test("FR-1.4 every Nurse-phase route answers 401 { error } with no token", async ({ request }) => {
  const calls = [
    () => request.get("/api/shifts"),
    () => request.post("/api/shifts/shift-1/claim", { data: {} }),
    () => request.post("/api/shifts/shift-2/cancel", { data: { reason: "advance" } }),
    () => request.get("/api/credentials/me"),
    () => request.post("/api/credentials", { data: "%PDF-1.4", headers: { "X-Expiry-Date": relativeDate(30) } }),
    () => request.get("/api/credentials/uploads/x/document"),
    () => request.get("/api/timesheet"),
  ]
  for (const send of calls) {
    const res = await send()
    await expect401(res)
    expect(await decoded(res, ERROR)).toEqual(EXPIRED)
  }
})

test("FR-1.4 a malformed Authorization header is 401", async ({ request }) => {
  const token = await apiToken(request, "nurse-1")
  for (const header of ["Bearer", "Bearer abc", "Basic Zm9v", token, "Bearer a.b"]) {
    const res = await request.get("/api/shifts", { headers: { Authorization: header } })
    await expect401(res)
    expect(await decoded(res, ERROR)).toEqual(EXPIRED)
  }
})

test("FR-1.4 a hand-minted token with the test secret is accepted", async ({ request }) => {
  const res = await request.get("/api/shifts", authed(hs256(maria(), secret())))
  expect(res.status()).toBe(200)
})

test("FR-1.4 a token signed with another key, an expired token and an alg none token are each 401", async ({
  request,
}) => {
  const tokens = [hs256(maria(), "x".repeat(32)), hs256({ ...maria(), exp: now() - 60 }, secret()), algNone(maria())]
  for (const token of tokens) {
    const res = await request.get("/api/shifts", authed(token))
    await expect401(res)
    expect(await decoded(res, ERROR)).toEqual(EXPIRED)
  }
})

test("FR-1.6 a real token with its payload edited to role admin is 401", async ({ request }) => {
  const [head, payload, signature] = (await apiToken(request, "nurse-1")).split(".")
  const original = Buffer.from(payload ?? "", "base64url").toString()
  expect(original).toContain('"role":"nurse"')
  const forged = `${head}.${b64(original.replace('"role":"nurse"', '"role":"admin"'))}.${signature}`
  for (const path of ["/api/shifts", "/api/timesheet"]) {
    const res = await request.get(path, authed(forged))
    await expect401(res)
    expect(await decoded(res, ERROR)).toEqual(EXPIRED)
  }
})

test("FR-1.5 agency and admin tokens get 403 { error } on nurse-only routes", async ({ request }) => {
  const FORBIDDEN = { error: "You don't have access to this" }
  for (const id of ["agency-a", "agency-b", "admin-1"] as const) {
    const token = await apiToken(request, id)
    const replies = [
      await request.post("/api/shifts/shift-1/claim", { ...authed(token), data: {} }),
      await request.get("/api/credentials/me", authed(token)),
      await request.post("/api/credentials", {
        headers: { ...authed(token).headers, "X-File-Name": "x.pdf", "X-Expiry-Date": relativeDate(30) },
        data: "%PDF-1.4",
      }),
    ]
    for (const res of replies) {
      expect(res.status()).toBe(403)
      expect(await keys(res)).toEqual(["error"])
      expect(await decoded(res, ERROR)).toEqual(FORBIDDEN)
    }
  }
  const list = await request.get("/api/shifts", authed(await apiToken(request, "nurse-1")))
  const { shifts } = await decoded(list, api.listShifts.response)
  const shift1 = shifts.find((x) => x.id === "shift-1")
  expect(shift1?.status).toBe("open")
  expect(shift1?.claimedBy).toBeNull()
})

test("FR-1.6 a claim body naming another nurse cannot change who claims", async ({ request }) => {
  const token = await apiToken(request, "nurse-1")
  const claim = await request.post("/api/shifts/shift-1/claim", {
    ...authed(token),
    data: { claimedBy: "nurse-2", nurseId: "nurse-2", role: "admin" },
  })
  expect(claim.status()).toBe(200)
  expect((await decoded(claim, api.claimShift.response)).claimedBy).toBe("nurse-1")

  const cancel = await request.post("/api/shifts/shift-2/cancel", {
    ...authed(token),
    data: { reason: "advance", previousNurseId: "nurse-2" },
  })
  expect(cancel.status()).toBe(200)
  expect((await decoded(cancel, api.cancelShift.response)).cancellation).toEqual({
    reason: "advance",
    previousNurseId: "nurse-1",
  })
})

test("FR-1.4 a session the server no longer holds returns to sign-in with one session-expired banner", async ({
  page,
}) => {
  await signInAs(page, "nurse-1")
  expect(await page.evaluate(() => document.cookie)).not.toContain("sid=") // HttpOnly: scripts never see it
  expect(await page.evaluate(() => window.localStorage.getItem("session"))).not.toContain("token")
  await db.execute(sql`DELETE FROM auth_sessions`).promise((e) => new Error(e.message))
  await page.reload()
  await expect(page.getByTestId("login-email-input")).toBeVisible()
  const banner = page.getByTestId("notification-banner")
  await expect(banner).toHaveCount(1) // /me and any parallel 401s land on one sign-out
  await expect(banner).toHaveText("Session expired, sign in again")
  expect(await page.evaluate(() => window.localStorage.getItem("session"))).toBeNull()

  await signInAs(page, "nurse-1")
  await expect(page.getByRole("heading", { level: 1, name: "Shifts" })).toBeVisible()
  await expect(page.getByTestId("notification-banner")).toHaveCount(0)
})

test("FR-1.9 Maria's landing screen shows all six nurse test IDs without navigation", async ({ page }) => {
  await signInAs(page, "nurse-1")
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId("shift-list-item")).toHaveCount(2)
  await expect(page.getByTestId("shift-claim-button")).toHaveCount(2)
  await expect(page.getByTestId("shift-cancel-button")).toHaveCount(1)
  for (const id of ["credential-upload-input", "credential-expiry-date-input", "timesheet-table"]) {
    await expect(page.getByTestId(id)).toBeVisible()
  }
})

test("FR-1.9 James's landing screen shows every nurse test ID that has data", async ({ page }) => {
  await signInAs(page, "nurse-2")
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByTestId("shift-list-item")).toHaveCount(2)
  await expect(page.getByTestId("shift-claim-button")).toHaveCount(2)
  await expect(page.getByTestId("shift-cancel-button")).toHaveCount(0)
  await expect(page.getByRole("region", { name: "Your shifts" }).getByText("Nothing claimed yet")).toBeVisible()
  for (const id of ["credential-upload-input", "credential-expiry-date-input", "timesheet-table"]) {
    await expect(page.getByTestId(id)).toBeVisible()
  }
  await expect(page.getByRole("region", { name: "Scheduled hours" }).getByText("No scheduled hours yet")).toBeVisible()
})
