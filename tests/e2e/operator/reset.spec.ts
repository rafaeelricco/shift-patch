import { execFile } from "node:child_process"

import * as s from "@lib/json/schema"
import { api } from "@api/endpoints"
import { db, sql, SAMPLE } from "@lib/db"
import type { Future } from "@lib/future"

import { test, expect, apiToken, authed, decoded, relativeDate, seededShift } from "../fixtures"

type CommandResult = { code: number; killed: boolean; stdout: string; stderr: string }

/** Exercise the published command, including its runner, alias resolution and pool cleanup. */
function resetCommand(databaseUrl: string): Promise<CommandResult> {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: databaseUrl }
  delete env["FORCE_COLOR"] // Playwright sets this alongside NO_COLOR; Node warns before the CLI starts.
  return new Promise((resolve) => {
    execFile(
      "pnpm",
      ["--silent", "operator:reset-seed"],
      { env, timeout: 15_000, encoding: "utf8" },
      (error, stdout, stderr) =>
        resolve({
          code:
            error === null ? 0
            : typeof error.code === "number" ? error.code
            : -1,
          killed: error?.killed ?? false,
          stdout,
          stderr,
        })
    )
  })
}

const run = <T>(value: Future<{ message: string }, T>) => value.promise((error) => new Error(error.message))
const auditRows = () =>
  run(
    db.rows(
      sql`SELECT id::text, action, record_id FROM audit_log ORDER BY audit_log.id`,
      s.object({ id: s.string, action: s.string, record_id: s.string })
    )
  )
const databaseUrl = (): string => {
  const value = process.env["E2E_DATABASE_URL"]
  if (value === undefined) throw new Error("The operator test requires the disposable E2E database")
  return value
}

test("FR-10 the operator command restores exact seed data, removes documents and keeps history and IDs", async ({
  request,
}) => {
  const agency = await apiToken(request, "agency-a")
  const nurse = await apiToken(request, "nurse-2")
  const post = () =>
    request.post("/api/shifts", {
      ...authed(agency),
      data: { role: "RN", date: relativeDate(1), startTime: "19:00", endTime: "07:00" },
    })
  const posted = await post()
  expect(posted.status()).toBe(201)
  const previous = await decoded(posted, api.postShift.response)
  const uploaded = await request.post("/api/credentials", {
    headers: {
      ...authed(nurse).headers,
      "Content-Type": "application/pdf",
      "X-File-Name": "synthetic-reset.pdf",
      "X-Expiry-Date": relativeDate(180),
    },
    data: Buffer.from("%PDF-1.4\nSynthetic test document\n%%EOF"),
  })
  expect(uploaded.status()).toBe(201)
  const uploadId = (await decoded(uploaded, api.uploadCredential.response)).latest?.id ?? ""
  expect(uploadId).not.toBe("")
  await run(db.execute(sql`DELETE FROM credentials WHERE nurse_id = 'nurse-1'`))
  await run(db.execute(sql`UPDATE credentials SET expires_on = '2030-01-01' WHERE nurse_id = 'nurse-2'`))
  await run(db.execute(sql`UPDATE shifts SET claimed_by = 'nurse-2' WHERE id = 'shift-1'`))
  await run(
    db.execute(sql`INSERT INTO login_failures (email, address) VALUES ('reset-test@example.com', 'operator-test')`)
  )
  const before = await auditRows()

  const result = await resetCommand(databaseUrl())
  expect(result).toEqual({
    code: 0,
    killed: false,
    stdout: "Sample data reset; audit log retained.\n",
    stderr: "",
  })
  const shifts = await request.get("/api/shifts", authed(agency))
  expect(shifts.status()).toBe(200)
  expect((await decoded(shifts, api.listShifts.response)).shifts).toEqual(
    SAMPLE.shifts.map((shift) => seededShift(shift.id))
  )
  expect(
    await run(
      db.rows(
        sql`SELECT nurse_id AS "nurseId", expires_on::text AS "expiresOn" FROM credentials ORDER BY nurse_id`,
        s.object({ nurseId: s.string, expiresOn: s.string })
      )
    )
  ).toEqual([...SAMPLE.credentials])
  expect(
    await run(
      db.one(
        sql`SELECT (SELECT count(*)::int FROM credential_uploads) AS uploads,
          (SELECT count(*)::int FROM login_failures) AS failures`,
        s.object({ uploads: s.number, failures: s.number })
      )
    )
  ).toEqual({ uploads: 0, failures: 0 })
  expect((await request.get(`/api/credentials/uploads/${uploadId}/document`, authed(nurse))).status()).toBe(404)
  const after = await auditRows()
  expect(after.slice(0, before.length)).toEqual(before)
  expect(after.slice(before.length)).toEqual([{ id: expect.any(String), action: "seed.reset", record_id: "seed" }])

  const next = await post()
  expect(next.status()).toBe(201)
  expect(Number((await decoded(next, api.postShift.response)).id.slice(6))).toBeGreaterThan(
    Number(previous.id.slice(6))
  )
})

test("FR-10 an audit failure rolls back the operator reset and exits without exposing database errors", async () => {
  await run(db.execute(sql`UPDATE credentials SET expires_on = '2030-01-01' WHERE nurse_id = 'nurse-2'`))
  await run(db.execute(sql`UPDATE shifts SET claimed_by = 'nurse-2' WHERE id = 'shift-1'`))
  const before = await auditRows()
  await run(
    db.execute(sql`CREATE FUNCTION operator_reset_failure() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.action = 'seed.reset' THEN RAISE EXCEPTION 'private-operator-fault'; END IF;
        RETURN NEW;
      END
    $$`)
  )
  try {
    await run(
      db.execute(sql`CREATE TRIGGER operator_reset_failure BEFORE INSERT ON audit_log
        FOR EACH ROW EXECUTE FUNCTION operator_reset_failure()`)
    )
    const result = await resetCommand(databaseUrl())
    expect(result.code).toBe(1)
    expect(result.killed).toBe(false)
    expect(result.stdout).toBe("")
    expect(result.stderr).toBe("Seed reset failed. Check the deployment database configuration and access.\n")
    expect(await auditRows()).toEqual(before)
    expect(
      await run(db.one(sql`SELECT claimed_by FROM shifts WHERE id = 'shift-1'`, s.object({ claimed_by: s.string })))
    ).toEqual({ claimed_by: "nurse-2" })
    expect(
      await run(
        db.one(
          sql`SELECT expires_on::text AS expiry FROM credentials WHERE nurse_id = 'nurse-2'`,
          s.object({ expiry: s.string })
        )
      )
    ).toEqual({ expiry: "2030-01-01" })
  } finally {
    await run(db.execute(sql`DROP TRIGGER IF EXISTS operator_reset_failure ON audit_log`))
    await run(db.execute(sql`DROP FUNCTION operator_reset_failure()`))
  }
})

for (const config of [
  { label: "missing", value: "" },
  { label: "malformed", value: "postgres://private-marker:%FF@127.0.0.1:1/missing" },
  { label: "unreachable", value: "postgres://private-marker@127.0.0.1:1/missing" },
]) {
  test(`FR-10 operator configuration failure is sanitized (${config.label})`, async () => {
    const result = await resetCommand(config.value)
    expect(result.code).toBe(1)
    expect(result.killed).toBe(false)
    expect(result.stdout).toBe("")
    expect(result.stderr).toBe("Seed reset failed. Check the deployment database configuration and access.\n")
  })
}
