export { SHIFT_SELECT, schema_shift_row, listShifts, shiftById, toApiShift, type ShiftRow }

import * as s from "@lib/json/schema"
import { Id } from "@lib/id"
import { sql, type Db, type DbError, type Sql } from "@lib/db"
import type { Future } from "@lib/future"
import type { Shift } from "@api/endpoints"

/** Every shift read selects exactly this, so every route answers in the same shape. */
const SHIFT_SELECT: Sql = sql`SELECT s.id, s.agency_id, a.name AS agency_name, s.role, s.date, s.start_time, s.end_time, s.claimed_by
  FROM shifts s JOIN accounts a ON a.id = s.agency_id`

const schema_shift_row = s.object({
  id: Id.schema<"Shift">(),
  agency_id: Id.schema<"User">(),
  agency_name: s.string,
  role: s.stringEnum(["RN", "LPN"]),
  date: s.string, // DATE stays a string (lib/db.ts type parser 1082)
  start_time: s.string,
  end_time: s.string,
  claimed_by: s.nullable(Id.schema<"User">()),
})
type ShiftRow = s.Infer<typeof schema_shift_row>

function listShifts(db: Db, where: Sql): Future<DbError, ReadonlyArray<ShiftRow>> {
  return db.rows(sql`${SHIFT_SELECT} WHERE ${where} ORDER BY s.date, s.start_time, s.id`, schema_shift_row)
}

function shiftById(db: Db, id: Id<"Shift">): Future<DbError, ShiftRow | null> {
  return db.maybeOne(sql`${SHIFT_SELECT} WHERE s.id = ${id.value}`, schema_shift_row)
}

/** Status is derived, never stored: claimed_by NULL is open (FR-6.9). */
function toApiShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    agencyId: row.agency_id,
    agencyName: row.agency_name,
    role: row.role,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    status: row.claimed_by === null ? "open" : "filled",
    claimedBy: row.claimed_by,
  }
}
