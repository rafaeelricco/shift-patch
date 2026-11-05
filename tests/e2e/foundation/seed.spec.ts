import * as s from "@lib/json/schema"
import { db, sql, SAMPLE } from "@lib/db"
import { audit } from "@lib/audit"
import { Future } from "@lib/future"
import { POST as login } from "@/app/api/auth/login/route"
import { GET as whoAmI } from "@/app/api/auth/me/route"
import { POST as logout } from "@/app/api/auth/logout/route"

import { test, expect, apiToken } from "../fixtures"

const run = <T>(f: Future<{ type: string; message: string }, T>) =>
  f.promise((e) => new Error(`${e.type}: ${e.message}`))
const count = (table: "accounts" | "credentials" | "shifts" | "audit_log") =>
  run(
    db.one(
      table === "accounts" ? sql`SELECT count(*)::int AS n FROM accounts`
      : table === "credentials" ? sql`SELECT count(*)::int AS n FROM credentials`
      : table === "shifts" ? sql`SELECT count(*)::int AS n FROM shifts`
      : sql`SELECT count(*)::int AS n FROM audit_log`,
      s.object({ n: s.number })
    )
  ).then((r) => r.n)

test("FR-11.1 the database holds exactly the sample accounts, credentials and shifts", async () => {
  const accounts = await run(
    db.rows(
      sql`SELECT id, role, name, email FROM accounts ORDER BY id`,
      s.object({ id: s.string, role: s.string, name: s.string, email: s.string })
    )
  )
  expect(accounts).toEqual([...SAMPLE.accounts].sort((a, b) => a.id.localeCompare(b.id)))
  const credentials = await run(
    db.rows(
      sql`SELECT nurse_id AS "nurseId", expires_on::text AS "expiresOn" FROM credentials ORDER BY nurse_id`,
      s.object({ nurseId: s.string, expiresOn: s.string })
    )
  )
  expect(credentials).toEqual([...SAMPLE.credentials])
  const shifts = await run(
    db.rows(
      sql`SELECT id, agency_id AS "agencyId", role, date::text AS date, start_time AS "startTime", end_time AS "endTime", claimed_by AS "claimedBy" FROM shifts ORDER BY id`,
      s.object({
        id: s.string,
        agencyId: s.string,
        role: s.string,
        date: s.string,
        startTime: s.string,
        endTime: s.string,
        claimedBy: s.nullable(s.string),
      })
    )
  )
  expect(shifts).toEqual([...SAMPLE.shifts])
})

test("FR-11.1 a second setup (a redeploy) changes no row count", async () => {
  const before = await Promise.all([count("accounts"), count("credentials"), count("shifts")])
  const g = globalThis as typeof globalThis & { shiftPatchReady?: unknown }
  g.shiftPatchReady = undefined
  await run(db.execute(sql`SELECT 1`))
  expect(await Promise.all([count("accounts"), count("credentials"), count("shifts")])).toEqual(before)
})

test("NFR-2 passwords are stored only as distinct salted scrypt hashes", async () => {
  const hashes = await run(db.rows(sql`SELECT password_hash AS h FROM accounts`, s.object({ h: s.string })))
  expect(hashes.every(({ h }) => h.startsWith("scrypt$"))).toBe(true)
  expect(new Set(hashes.map(({ h }) => h)).size).toBe(hashes.length)
})

test("FR-8.3 a failed transaction keeps neither the change nor its audit entry", async () => {
  const before = await count("audit_log")
  const result = await db
    .transaction((tx) =>
      audit(tx, {
        actorId: "admin-1",
        action: "shift.cancelled",
        recordId: "shift-2",
        reason: "advance",
        previousNurseId: "nurse-1",
      })
        .chain(() => tx.execute(sql`UPDATE shifts SET claimed_by = NULL WHERE id = 'shift-2'`))
        .chain(() =>
          tx.execute(
            sql`INSERT INTO shifts (id, agency_id, role, date, start_time, end_time) VALUES ('shift-1', 'agency-a', 'RN', '2026-10-02', '07:00', '19:00')`
          )
        )
    )
    .promiseR()
  expect(
    result.either(
      () => "failed",
      () => "committed"
    )
  ).toBe("failed")
  expect(await count("audit_log")).toBe(before)
  const shift2 = await run(
    db.one(sql`SELECT claimed_by FROM shifts WHERE id = 'shift-2'`, s.object({ claimed_by: s.nullable(s.string) }))
  )
  expect(shift2.claimed_by).toBe("nurse-1")
})

test("NFR-3 a login after the pool reconnects still works (restart stand-in)", async ({ request }) => {
  const g = globalThis as typeof globalThis & {
    shiftPatchPool?: { end: () => Promise<void> } | undefined
    shiftPatchReady?: unknown
  }
  await g.shiftPatchPool?.end()
  g.shiftPatchPool = undefined
  g.shiftPatchReady = undefined
  expect(await count("shifts")).toBe(SAMPLE.shifts.length)
  expect(await apiToken(request, "nurse-1")).toContain(".")
})

type Globals = typeof globalThis & {
  shiftPatchPool?: { end: () => Promise<void> } | undefined
  shiftPatchReady?: unknown
}

/** Drops this process's pool and setup memo, as a new server instance would start without them. */
async function newInstance(): Promise<void> {
  const g = globalThis as Globals
  const pool = g.shiftPatchPool
  g.shiftPatchPool = undefined
  g.shiftPatchReady = undefined
  await pool?.end()
}

/** Points @lib/db at another database for one callback, then restores the test database. */
async function withDatabase<T>(name: string, f: () => Promise<T>): Promise<T> {
  const original = process.env["DATABASE_URL"] ?? ""
  await newInstance()
  const url = new URL(original)
  url.pathname = `/${name}`
  process.env["DATABASE_URL"] = url.toString()
  try {
    return await f()
  } finally {
    await newInstance()
    process.env["DATABASE_URL"] = original
  }
}

test("FR-11.1 first login on an empty database seeds sample data and creates a working cookie session", async () => {
  const name = "shiftpatch_fresh"
  await run(db.execute(sql`DROP DATABASE IF EXISTS shiftpatch_fresh`))
  await run(db.execute(sql`CREATE DATABASE shiftpatch_fresh`))
  try {
    await withDatabase(name, async () => {
      // Invoke the real routes in this process: HTTP calls would use the web server's original database.
      // Login is the first use, so all tables it needs must be created by setup(), without resetToSeed.
      const response = await login(
        new Request("https://shiftpatch.example/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "maria.lopez@example.com", password: SAMPLE.password }),
        })
      )
      expect(response.status).toBe(200)
      const cookie = response.headers.get("set-cookie")?.split(";")[0] ?? ""
      expect(cookie).toMatch(/^sid=.+$/)
      const headers = { Cookie: cookie }
      const me = () => whoAmI(new Request("https://shiftpatch.example/api/auth/me", { headers }))
      const actor = { type: "User", id: "nurse-1", name: "Maria Lopez", role: "nurse" }
      expect(await (await me()).json()).toEqual({ actor })

      // Replaying the migrations after a restart must preserve the existing session.
      await newInstance()
      expect(await (await me()).json()).toEqual({ actor })
      expect(
        (await logout(new Request("https://shiftpatch.example/api/auth/logout", { method: "POST", headers }))).status
      ).toBe(200)
      expect(await (await me()).json()).toEqual({ actor: { type: "Anonymous" } })

      const shifts = await run(
        db.rows(
          sql`SELECT id, agency_id AS "agencyId", role, date::text AS date, start_time AS "startTime", end_time AS "endTime", claimed_by AS "claimedBy" FROM shifts ORDER BY id`,
          s.object({
            id: s.string,
            agencyId: s.string,
            role: s.string,
            date: s.string,
            startTime: s.string,
            endTime: s.string,
            claimedBy: s.nullable(s.string),
          })
        )
      )
      expect(shifts).toEqual([...SAMPLE.shifts])
      const credentials = await run(
        db.rows(
          sql`SELECT nurse_id AS "nurseId", expires_on::text AS "expiresOn" FROM credentials ORDER BY nurse_id`,
          s.object({ nurseId: s.string, expiresOn: s.string })
        )
      )
      expect(credentials).toEqual([...SAMPLE.credentials])
      expect(await count("accounts")).toBe(SAMPLE.accounts.length)
    })
  } finally {
    await run(db.execute(sql`DROP DATABASE IF EXISTS shiftpatch_fresh`))
  }
})

test("FR-11.1 a redeploy does not overwrite changed data", async () => {
  await run(db.execute(sql`UPDATE shifts SET claimed_by = 'nurse-2' WHERE id = 'shift-1'`))
  await run(db.execute(sql`UPDATE credentials SET expires_on = '2030-01-01' WHERE nurse_id = 'nurse-2'`))
  const g = globalThis as Globals
  g.shiftPatchReady = undefined // the next query runs setup() again, as a new instance would
  const shift1 = await run(
    db.one(sql`SELECT claimed_by FROM shifts WHERE id = 'shift-1'`, s.object({ claimed_by: s.nullable(s.string) }))
  )
  const james = await run(
    db.one(sql`SELECT expires_on::text AS e FROM credentials WHERE nurse_id = 'nurse-2'`, s.object({ e: s.string }))
  )
  expect(shift1.claimed_by).toBe("nurse-2")
  expect(james.e).toBe("2030-01-01")
})
