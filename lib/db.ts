export { db, sql, Sql, closeDb, type Db, type DbError, SAMPLE }

import pg, { type PoolClient } from "pg"

import * as s from "@lib/json/schema"
import { Future } from "@lib/future"
import type { Result } from "@lib/result"
import { hashPassword } from "@lib/password"

// Keep DATE (1082) and TIMESTAMPTZ (1184) as the strings Postgres sends. A shift's
// facility-local date must never pass through Date (time.md, "Facility-local time").
pg.types.setTypeParser(1082, (v: string) => v)
pg.types.setTypeParser(1184, (v: string) => v)

/** A query whose interpolations are always bound parameters. A nested `Sql` is spliced as a fragment. */
class Sql {
  readonly parts: ReadonlyArray<string>
  readonly values: ReadonlyArray<unknown>
  constructor(parts: ReadonlyArray<string>, values: ReadonlyArray<unknown>) {
    this.parts = parts
    this.values = values
  }
}

function sql(strings: TemplateStringsArray, ...values: ReadonlyArray<unknown>): Sql {
  return new Sql([...strings], values)
}

function compile(q: Sql): { text: string; values: Array<unknown> } {
  const values: Array<unknown> = []
  const walk = (node: Sql): string =>
    node.parts.reduce((text, part, i) => {
      if (i === 0) return part
      const value = node.values[i - 1]
      if (value instanceof Sql) return text + walk(value) + part
      values.push(value)
      return `${text}$${values.length}${part}`
    }, "")
  return { text: walk(q), values }
}

type DbError =
  | { type: "QueryFailed"; code: string | null; message: string } // code is the SQLSTATE, e.g. 23505
  | { type: "UnexpectedRows"; message: string }

type Db = {
  rows<T>(q: Sql, schema: s.Schema<T>): Future<DbError, ReadonlyArray<T>>
  one<T>(q: Sql, schema: s.Schema<T>): Future<DbError, T>
  maybeOne<T>(q: Sql, schema: s.Schema<T>): Future<DbError, T | null>
  execute(q: Sql): Future<DbError, number>
}

function toDbError(e: Error): DbError {
  const code = "code" in e && typeof e.code === "string" ? e.code : null
  return { type: "QueryFailed", code, message: e.message }
}

function on(client: pg.Pool | PoolClient): Db {
  const raw = (q: Sql): Future<DbError, { rows: ReadonlyArray<unknown>; count: number }> =>
    Future.attemptP(() => client.query(compile(q))).bimap(toDbError, (r) => ({
      rows: r.rows,
      count: r.rowCount ?? 0,
    }))
  const rows = <T>(q: Sql, schema: s.Schema<T>): Future<DbError, ReadonlyArray<T>> =>
    raw(q).chain(({ rows }) =>
      Future.fromResult(s.decode(s.array(schema), rows)).mapRej((message): DbError => ({
        type: "UnexpectedRows",
        message,
      }))
    )
  return {
    rows,
    one: <T>(q: Sql, schema: s.Schema<T>) =>
      rows(q, schema).chain((xs) => {
        const [first] = xs
        return xs.length === 1 && first !== undefined ?
            Future.resolve<DbError, T>(first)
          : Future.reject<DbError, T>({ type: "UnexpectedRows", message: `Expected one row, got ${xs.length}` })
      }),
    maybeOne: <T>(q: Sql, schema: s.Schema<T>) =>
      rows(q, schema).chain((xs) =>
        xs.length <= 1 ?
          Future.resolve<DbError, T | null>(xs[0] ?? null)
        : Future.reject<DbError, T | null>({
            type: "UnexpectedRows",
            message: `Expected at most one row, got ${xs.length}`,
          })
      ),
    execute: (q) => raw(q).map(({ count }) => count),
  }
}

const g = globalThis as typeof globalThis & {
  shiftPatchPool?: pg.Pool
  shiftPatchReady?: Promise<Result<DbError, void>> | undefined
}

/** Operator processes call this after their last query so no idle pool keeps the command alive. */
async function closeDb(): Promise<void> {
  const active = g.shiftPatchPool
  delete g.shiftPatchPool
  g.shiftPatchReady = undefined
  await active?.end()
}

// Throws on a missing DATABASE_URL: a configuration error. Every caller sits in an async attemptP
// thunk, because Fluture's attemptP doesn't catch synchronous throws.
function pool(): pg.Pool {
  const connectionString = process.env["DATABASE_URL"]
  if (connectionString === undefined || connectionString === "") throw new Error("DATABASE_URL is not set")
  g.shiftPatchPool ??= new pg.Pool({ connectionString, max: 5 })
  return g.shiftPatchPool
}

function withTransaction<T>(f: (tx: Db) => Future<DbError, T>): Future<DbError, T> {
  return Future.bracket(
    Future.attemptP(async () => pool().connect()).mapRej(toDbError),
    (client) => Future.attemptP(() => Promise.resolve(client.release())).mapRej(toDbError),
    (client) => {
      const tx = on(client)
      return tx
        .execute(sql`BEGIN`)
        .chain(() => f(tx))
        .chain((value) => tx.execute(sql`COMMIT`).map(() => value))
        .chainRej((e) =>
          tx.execute(sql`ROLLBACK`).bichain(
            () => Future.reject<DbError, T>(e),
            () => Future.reject<DbError, T>(e)
          )
        )
    }
  )
}

// Additive only: later phases append statements, never edit shipped ones.
const MIGRATIONS: ReadonlyArray<Sql> = [
  sql`CREATE TABLE IF NOT EXISTS accounts (
    id text PRIMARY KEY,
    role text NOT NULL CHECK (role IN ('nurse', 'agency', 'admin')),
    name text NOT NULL,
    email text NOT NULL UNIQUE CHECK (email = lower(email)),
    password_hash text NOT NULL
  )`,
  // The approved expiry date FR-4.4 reads. Uploads awaiting review live elsewhere (Nurse phase).
  sql`CREATE TABLE IF NOT EXISTS credentials (
    nurse_id text PRIMARY KEY REFERENCES accounts (id),
    expires_on date NOT NULL
  )`,
  sql`CREATE SEQUENCE IF NOT EXISTS shift_number START 4`, // FR-2.7: shift-1..3 are seeded, numbers never reused
  // Status is derived (claimed_by null = open), so "cancelled" can never be stored (FR-6.9).
  sql`CREATE TABLE IF NOT EXISTS shifts (
    id text PRIMARY KEY,
    agency_id text NOT NULL REFERENCES accounts (id),
    role text NOT NULL CHECK (role IN ('RN', 'LPN')),
    date date NOT NULL,
    start_time text NOT NULL CHECK (start_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    end_time text NOT NULL CHECK (end_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
    claimed_by text REFERENCES accounts (id),
    CHECK (start_time <> end_time)
  )`,
  // Append-only (FR-8.4): no route issues UPDATE or DELETE on it, and the reset keeps it (FR-10.3).
  sql`CREATE TABLE IF NOT EXISTS audit_log (
    id bigserial PRIMARY KEY,
    at timestamptz NOT NULL DEFAULT now(),
    actor_id text,
    action text NOT NULL,
    record_id text NOT NULL,
    reason text,
    previous_nurse_id text
  )`,
  sql`CREATE TABLE IF NOT EXISTS login_failures (
    email text NOT NULL,
    address text NOT NULL,
    at timestamptz NOT NULL DEFAULT now()
  )`,
  sql`CREATE INDEX IF NOT EXISTS login_failures_pair ON login_failures (email, address, at)`,
  sql`CREATE TABLE IF NOT EXISTS seed_state (
    id int PRIMARY KEY CHECK (id = 1),
    seeded_at timestamptz NOT NULL DEFAULT now()
  )`,
  // FR-7: the document is a bytea column, never a file, because the host disk is ephemeral (NFR-3).
  // Removing the row removes the file.
  sql`CREATE TABLE IF NOT EXISTS credential_uploads (
    id text PRIMARY KEY,
    nurse_id text NOT NULL REFERENCES accounts (id),
    expires_on date NOT NULL,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    content_type text NOT NULL CHECK (content_type IN ('application/pdf', 'image/png', 'image/jpeg')),
    file_name text NOT NULL,
    byte_size int NOT NULL CHECK (byte_size > 0 AND byte_size <= 4194304),
    document bytea NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now(),
    reviewed_at timestamptz
  )`,
  // FR-7.5: at most one pending upload per nurse. The upload route replaces it under a lock; this is the backstop.
  sql`CREATE UNIQUE INDEX IF NOT EXISTS credential_uploads_one_pending ON credential_uploads (nurse_id) WHERE status = 'pending'`,
  sql`CREATE INDEX IF NOT EXISTS credential_uploads_latest ON credential_uploads (nurse_id, uploaded_at DESC)`,
  // Browser sessions store only a token digest; login, /me and logout share this table.
  sql`CREATE TABLE IF NOT EXISTS auth_sessions (
    token_hash text PRIMARY KEY,
    account_id text NOT NULL REFERENCES accounts (id),
    expires_at timestamptz NOT NULL
  )`,
  sql`CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions (expires_at)`,
]

// The technical spec's sample data, exactly (FR-11.1). The password is the published sample one (NFR-2).
const SAMPLE = {
  password: "Trial2026!",
  accounts: [
    { id: "agency-a", role: "agency", name: "Sunrise Health Staffing", email: "admin@sunrisehealth.example" },
    { id: "agency-b", role: "agency", name: "Metro Care Partners", email: "admin@metrocare.example" },
    { id: "nurse-1", role: "nurse", name: "Maria Lopez", email: "maria.lopez@example.com" },
    { id: "nurse-2", role: "nurse", name: "James Cook", email: "james.cook@example.com" },
    { id: "admin-1", role: "admin", name: "Alex Kim", email: "alex.kim@example.com" },
  ],
  credentials: [
    { nurseId: "nurse-1", expiresOn: "2027-01-01" },
    { nurseId: "nurse-2", expiresOn: "2026-06-01" },
  ],
  shifts: [
    {
      id: "shift-1",
      agencyId: "agency-a",
      role: "RN",
      date: "2026-10-02",
      startTime: "19:00",
      endTime: "07:00",
      claimedBy: null,
    },
    {
      id: "shift-2",
      agencyId: "agency-a",
      role: "LPN",
      date: "2026-10-03",
      startTime: "07:00",
      endTime: "19:00",
      claimedBy: "nurse-1",
    },
    {
      id: "shift-3",
      agencyId: "agency-b",
      role: "RN",
      date: "2026-10-04",
      startTime: "19:00",
      endTime: "07:00",
      claimedBy: null,
    },
  ],
} as const

function seedSample(tx: Db): Future<DbError, void> {
  const accounts = Future.traverse(
    (a: (typeof SAMPLE.accounts)[number]) =>
      hashPassword(SAMPLE.password)
        .mapRej(toDbError)
        .chain((hash) =>
          tx.execute(sql`INSERT INTO accounts (id, role, name, email, password_hash)
            VALUES (${a.id}, ${a.role}, ${a.name}, ${a.email}, ${hash})`)
        ),
    [...SAMPLE.accounts]
  )
  const credentials = Future.traverse(
    (c: (typeof SAMPLE.credentials)[number]) =>
      tx.execute(sql`INSERT INTO credentials (nurse_id, expires_on) VALUES (${c.nurseId}, ${c.expiresOn})`),
    [...SAMPLE.credentials]
  )
  const shifts = Future.traverse(
    (x: (typeof SAMPLE.shifts)[number]) =>
      tx.execute(sql`INSERT INTO shifts (id, agency_id, role, date, start_time, end_time, claimed_by)
        VALUES (${x.id}, ${x.agencyId}, ${x.role}, ${x.date}, ${x.startTime}, ${x.endTime}, ${x.claimedBy})`),
    [...SAMPLE.shifts]
  )
  return accounts
    .chain(() => credentials)
    .chain(() => shifts)
    .map(() => undefined)
}

const SETUP_LOCK = 4207

// Every instance runs this once. The lock serialises concurrent cold starts, and seed_state
// makes the first seed happen exactly once, so a redeploy neither duplicates nor overwrites (FR-11.1).
function setup(): Future<DbError, void> {
  return withTransaction((tx) =>
    tx
      .execute(sql`SELECT pg_advisory_xact_lock(${SETUP_LOCK})`)
      .chain(() => Future.traverse((q: Sql) => tx.execute(q), [...MIGRATIONS]))
      .chain(() =>
        tx.rows(
          sql`INSERT INTO seed_state (id) VALUES (1) ON CONFLICT DO NOTHING RETURNING id`,
          s.object({ id: s.number })
        )
      )
      .chain((inserted) => (inserted.length === 0 ? Future.resolve<DbError, void>(undefined) : seedSample(tx)))
  )
}

// Memoised per process. A failed setup clears the memo so the next request retries.
function ready(): Future<DbError, void> {
  return Future.attemptP(() => (g.shiftPatchReady ??= setup().promiseR()))
    .mapRej(toDbError)
    .chain((r) => Future.fromResult(r))
    .chainRej((e) => {
      g.shiftPatchReady = undefined
      return Future.reject<DbError, void>(e)
    })
}

const db: Db & { transaction<T>(f: (tx: Db) => Future<DbError, T>): Future<DbError, T> } = {
  // ready() has already created the pool, so pool() can't throw here.
  rows: (q, schema) => ready().chain(() => on(pool()).rows(q, schema)),
  one: (q, schema) => ready().chain(() => on(pool()).one(q, schema)),
  maybeOne: (q, schema) => ready().chain(() => on(pool()).maybeOne(q, schema)),
  execute: (q) => ready().chain(() => on(pool()).execute(q)),
  transaction: (f) => ready().chain(() => withTransaction(f)),
}
