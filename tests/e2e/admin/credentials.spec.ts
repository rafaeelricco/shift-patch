import type { APIRequestContext } from "@playwright/test"

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql, type DbError } from "@lib/db"
import { Future } from "@lib/future"

import { test, expect, apiToken, authed, decoded, relativeDate } from "../fixtures"

const ERROR = s.object({ error: s.string })
const PDF = Buffer.from("%PDF-1.4\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n")
const run = <T>(task: Future<DbError, T>) => task.promise((e) => new Error(e.message))

async function upload(request: APIRequestContext, token: string, name = "sample.pdf") {
  const res = await request.post("/api/credentials", {
    data: PDF,
    headers: {
      ...authed(token).headers,
      "Content-Type": "application/pdf",
      "X-File-Name": name,
      "X-Expiry-Date": relativeDate(365),
    },
  })
  expect(res.status()).toBe(201)
  const latest = (await decoded(res, api.uploadCredential.response)).latest
  expect(latest).not.toBeNull()
  if (latest === null) throw new Error("Upload did not return its record")
  return latest.id.value
}

const review = (request: APIRequestContext, token: string, id: string, decision: string) =>
  request.post(`/api/admin/credentials/${id}/review`, { ...authed(token), data: { decision } })

const summary = async (request: APIRequestContext, token: string) => {
  const res = await request.get("/api/credentials/me", authed(token))
  expect(res.status()).toBe(200)
  return decoded(res, api.credential.response)
}

const uploadState = (id: string) =>
  run(
    db.maybeOne(
      sql`SELECT status, reviewed_at IS NOT NULL AS reviewed FROM credential_uploads WHERE id = ${id}`,
      s.object({ status: s.string, reviewed: s.boolean })
    )
  )

/** Holds the same database resource independently of the implementation, so request order is observable. */
async function withNurseLock(nurseId: string, check: (release: () => void) => Promise<void>): Promise<void> {
  let acquired = (): void => {}
  let release = (): void => {}
  const ready = new Promise<void>((resolve) => {
    acquired = resolve
  })
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  const held = run(
    db.transaction((tx) =>
      tx.execute(sql`SELECT pg_advisory_xact_lock(2, hashtext(${nurseId}))`).chain(() => {
        acquired()
        return Future.attemptP(() => gate).mapRej((e): DbError => ({
          type: "QueryFailed",
          code: null,
          message: e.message,
        }))
      })
    )
  )
  try {
    await Promise.race([ready, held])
    await check(release)
  } finally {
    release()
    await held
  }
}

async function blocked(count: number): Promise<void> {
  await expect
    .poll(async () => {
      const row = await run(
        db.one(
          sql`SELECT count(*)::int AS n FROM pg_locks WHERE locktype = 'advisory' AND classid = 2 AND NOT granted`,
          s.object({ n: s.number })
        )
      )
      return row.n
    })
    .toBe(count)
}

test("FR-7.6 pending list is oldest first and excludes reviewed uploads", async ({ request }) => {
  const admin = await apiToken(request, "admin-1")
  const james = await apiToken(request, "nurse-2")
  const maria = await apiToken(request, "nurse-1")
  const first = await upload(request, james, "james.pdf")
  const second = await upload(request, maria, "maria.pdf")
  await run(
    db.execute(sql`UPDATE credential_uploads SET uploaded_at = now() - interval '1 minute' WHERE id = ${first}`)
  )
  const response = await request.get("/api/admin/credentials", authed(admin))
  expect(response.status()).toBe(200)
  const rows = (await decoded(response, api.pendingCredentials.response)).uploads
  expect(rows.map((row) => row.id.value)).toEqual([first, second])
  expect(rows.map((row) => [row.nurseName, row.fileName, row.expiresOn.pretty()])).toEqual([
    ["James Cook", "james.pdf", relativeDate(365)],
    ["Maria Lopez", "maria.pdf", relativeDate(365)],
  ])
  const [oldest, newest] = rows
  if (oldest === undefined || newest === undefined) throw new Error("Pending uploads are missing")
  expect(oldest.uploadedAt.compare(newest.uploadedAt)).toBeLessThan(0)
  expect(Object.keys(oldest).sort()).toEqual(["id", "nurseName", "fileName", "expiresOn", "uploadedAt"].sort())
  expect((await review(request, admin, first, "rejected")).status()).toBe(200)
  const remaining = await request.get("/api/admin/credentials", authed(admin))
  expect((await decoded(remaining, api.pendingCredentials.response)).uploads.map((row) => row.id.value)).toEqual([
    second,
  ])
})

for (const account of ["nurse-1", "nurse-2", "agency-a", "agency-b"] as const) {
  test(`FR-7.6 ${account} cannot list or review credentials`, async ({ request }) => {
    const id = await upload(request, await apiToken(request, "nurse-2"))
    const token = await apiToken(request, account)
    const responses = [
      await request.get("/api/admin/credentials", authed(token)),
      await review(request, token, id, "approved"),
      await review(request, token, id, "rejected"),
    ]
    for (const response of responses) {
      expect(response.status()).toBe(403)
      expect(await decoded(response, ERROR)).toEqual({ error: "You don't have access to this" })
    }
    expect(await uploadState(id)).toEqual({ status: "pending", reviewed: false })
  })
}

test("FR-7.6 review validates authentication, body, existence and final state", async ({ request }) => {
  const admin = await apiToken(request, "admin-1")
  const id = await upload(request, await apiToken(request, "nurse-2"))
  for (const response of [
    await request.get("/api/admin/credentials"),
    await request.post(`/api/admin/credentials/${id}/review`, { data: { decision: "approved" } }),
  ]) {
    expect(response.status()).toBe(401)
    expect(await decoded(response, ERROR)).toEqual({ error: "Session expired, sign in again" })
  }
  for (const data of [{}, { decision: "pending" }, { decision: true }]) {
    const response = await request.post(`/api/admin/credentials/${id}/review`, { ...authed(admin), data })
    expect(response.status()).toBe(400)
    expect(await decoded(response, ERROR)).toEqual({ error: "Choose approve or reject" })
  }
  const missing = await review(request, admin, "upload-missing", "approved")
  expect(missing.status()).toBe(404)
  expect(await decoded(missing, ERROR)).toEqual({ error: "Credential upload not found" })
  expect((await review(request, admin, id, "rejected")).status()).toBe(200)
  const repeated = await review(request, admin, id, "approved")
  expect(repeated.status()).toBe(409)
  expect(await decoded(repeated, ERROR)).toEqual({ error: "Credential upload already reviewed" })
})

test("FR-7.6 approval changes eligibility, review timestamp and one audit entry", async ({ request, auditLog }) => {
  const james = await apiToken(request, "nurse-2")
  const id = await upload(request, james)
  expect((await request.post("/api/shifts/shift-1/claim", authed(james))).status()).toBe(403)
  const response = await review(request, await apiToken(request, "admin-1"), id, "approved")
  expect(response.status()).toBe(200)
  expect(await response.json()).toEqual({ id, status: "approved" })
  const current = await summary(request, james)
  expect(current.approved?.expiresOn.pretty()).toBe(relativeDate(365))
  expect(current.approved?.state).toBe("valid")
  expect(current.latest?.status).toBe("approved")
  expect(await uploadState(id)).toEqual({ status: "approved", reviewed: true })
  expect((await request.post("/api/shifts/shift-1/claim", authed(james))).status()).toBe(200)
  expect((await auditLog.entries(id)).map((entry) => [entry.action, entry.actor_id])).toEqual([
    ["credential.uploaded", "nurse-2"],
    ["credential.approved", "admin-1"],
  ])
})

test("FR-7.6 rejection preserves the approved credential and records one decision", async ({ request, auditLog }) => {
  const james = await apiToken(request, "nurse-2")
  const id = await upload(request, james)
  expect((await review(request, await apiToken(request, "admin-1"), id, "rejected")).status()).toBe(200)
  const current = await summary(request, james)
  expect(current.approved?.expiresOn.pretty()).toBe("2026-06-01")
  expect(current.latest?.status).toBe("rejected")
  expect(await uploadState(id)).toEqual({ status: "rejected", reviewed: true })
  expect((await request.post("/api/shifts/shift-1/claim", authed(james))).status()).toBe(403)
  expect((await auditLog.entries(id)).map((entry) => entry.action)).toEqual([
    "credential.uploaded",
    "credential.rejected",
  ])
})

test("FR-7.6 a pending expiry elapsed before approval remains ineligible", async ({ request }) => {
  const james = await apiToken(request, "nurse-2")
  const id = await upload(request, james)
  await run(db.execute(sql`UPDATE credential_uploads SET expires_on = ${relativeDate(-1)}::date WHERE id = ${id}`))
  expect((await review(request, await apiToken(request, "admin-1"), id, "approved")).status()).toBe(200)
  expect((await summary(request, james)).approved?.state).toBe("expired")
  const claim = await request.post("/api/shifts/shift-1/claim", authed(james))
  expect(claim.status()).toBe(403)
  expect(await decoded(claim, ERROR)).toEqual({ error: "Credential expired, cannot claim shift" })
})

test("FR-7.6 approval creates a missing approved credential row", async ({ request }) => {
  const james = await apiToken(request, "nurse-2")
  const id = await upload(request, james)
  await run(db.execute(sql`DELETE FROM credentials WHERE nurse_id = 'nurse-2'`))
  expect((await review(request, await apiToken(request, "admin-1"), id, "approved")).status()).toBe(200)
  expect((await summary(request, james)).approved?.expiresOn.pretty()).toBe(relativeDate(365))
  expect((await request.post("/api/shifts/shift-1/claim", authed(james))).status()).toBe(200)
})

test("FR-7.6 concurrent decisions commit only one review and audit entry", async ({ request, auditLog }) => {
  const id = await upload(request, await apiToken(request, "nurse-2"))
  const admin = await apiToken(request, "admin-1")
  await withNurseLock("nurse-2", async (release) => {
    const approval = review(request, admin, id, "approved")
    await blocked(1)
    const rejection = review(request, admin, id, "rejected")
    await blocked(2)
    release()
    const responses = await Promise.all([approval, rejection])
    expect(responses.map((response) => response.status()).sort()).toEqual([200, 409])
    const winner = responses.find((response) => response.status() === 200)
    if (winner === undefined) throw new Error("No review succeeded")
    const result = await decoded(winner, api.reviewCredential.response)
    expect((await uploadState(id))?.status).toBe(result.status)
    expect((await auditLog.entries(id)).map((entry) => entry.action)).toEqual([
      "credential.uploaded",
      `credential.${result.status}`,
    ])
  })
})

for (const first of ["replacement", "review"] as const) {
  test(`FR-7.6 ${first} winning a replacement race leaves no stale approval`, async ({ request, auditLog }) => {
    const james = await apiToken(request, "nurse-2")
    const admin = await apiToken(request, "admin-1")
    const id = await upload(request, james, "original.pdf")
    await withNurseLock("nurse-2", async (release) => {
      const startReview = () => review(request, admin, id, "approved")
      const startReplacement = () => upload(request, james, "replacement.pdf")
      const firstRequest = first === "replacement" ? startReplacement() : startReview()
      await blocked(1)
      const secondRequest = first === "replacement" ? startReview() : startReplacement()
      await blocked(2)
      release()
      const results = await Promise.all([firstRequest, secondRequest])
      const response = results.find((result) => typeof result !== "string")
      if (response === undefined) throw new Error("Review response is missing")
      expect(response.status()).toBe(first === "replacement" ? 404 : 200)
      expect((await summary(request, james)).latest).toMatchObject({ fileName: "replacement.pdf", status: "pending" })
      expect((await auditLog.entries(id)).filter((entry) => entry.action === "credential.approved")).toHaveLength(
        first === "review" ? 1 : 0
      )
      expect(await uploadState(id)).toEqual(first === "replacement" ? null : { status: "approved", reviewed: true })
    })
  })
}

test("FR-4.4 a claim queued behind approval reads the committed credential", async ({ request }) => {
  const james = await apiToken(request, "nurse-2")
  const admin = await apiToken(request, "admin-1")
  const id = await upload(request, james)
  await withNurseLock("nurse-2", async (release) => {
    const approval = review(request, admin, id, "approved")
    await blocked(1)
    const claim = request.post("/api/shifts/shift-1/claim", authed(james))
    await blocked(2)
    release()
    expect((await approval).status()).toBe(200)
    expect((await claim).status()).toBe(200)
  })
})

test("FR-4.4 a claim before approval stays blocked without changing the shift", async ({ request, auditLog }) => {
  const james = await apiToken(request, "nurse-2")
  const admin = await apiToken(request, "admin-1")
  const id = await upload(request, james)
  await withNurseLock("nurse-2", async (release) => {
    const claim = request.post("/api/shifts/shift-1/claim", authed(james))
    await blocked(1)
    const approval = review(request, admin, id, "approved")
    await blocked(2)
    release()
    expect((await claim).status()).toBe(403)
    expect((await approval).status()).toBe(200)
  })
  const response = await request.get("/api/shifts", authed(james))
  expect(
    (await decoded(response, api.listShifts.response)).shifts.find((shift) => shift.id.value === "shift-1")
  ).toMatchObject({
    status: "open",
    claimedBy: null,
  })
  expect((await auditLog.entries("shift-1")).map((entry) => entry.action)).toEqual(["claim.blocked"])
})

for (const decision of ["approved", "rejected"] as const) {
  test(`FR-8.3 ${decision} rolls back when its audit write fails`, async ({ request, auditLog }) => {
    const james = await apiToken(request, "nurse-2")
    const id = await upload(request, james)
    const admin = await apiToken(request, "admin-1")
    // Review audit inserts are rejected only during this test on the disposable database.
    await run(
      db.execute(sql`CREATE OR REPLACE FUNCTION fail_review_audit() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action IN ('credential.approved', 'credential.rejected') THEN
          RAISE EXCEPTION 'intentional audit failure';
        END IF;
        RETURN NEW;
      END $$`)
    )
    await run(
      db.execute(sql`CREATE TRIGGER fail_review_audit BEFORE INSERT ON audit_log
      FOR EACH ROW EXECUTE FUNCTION fail_review_audit()`)
    )
    try {
      const response = await review(request, admin, id, decision)
      expect(response.status()).toBe(500)
      expect(await decoded(response, ERROR)).toEqual({ error: "Something went wrong, try again" })
      expect(await uploadState(id)).toEqual({ status: "pending", reviewed: false })
      expect((await summary(request, james)).approved?.expiresOn.pretty()).toBe("2026-06-01")
      expect((await auditLog.entries(id)).map((entry) => entry.action)).toEqual(["credential.uploaded"])
    } finally {
      await run(db.execute(sql`DROP TRIGGER fail_review_audit ON audit_log`))
      await run(db.execute(sql`DROP FUNCTION fail_review_audit()`))
    }
  })
}
