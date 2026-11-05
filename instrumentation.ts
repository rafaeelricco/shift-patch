// Warms the pool and runs setup at boot, so the first request doesn't pay for it. Requests still
// pass lib/db.ts's ready() gate, so an instance that skipped this is safe.
export async function register(): Promise<void> {
  if (process.env["NEXT_RUNTIME"] !== "nodejs") return
  if (process.env["DATABASE_URL"] === undefined) return
  const { db, sql } = await import("@lib/db")
  const result = await db.execute(sql`SELECT 1`).promiseR()
  result.either(
    (e) => console.error("database setup failed", e.type, e.message),
    () => undefined
  )
}
