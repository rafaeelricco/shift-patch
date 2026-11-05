export {
  api,
  schema_user,
  schema_shift,
  schema_cancel_reason,
  type User,
  type Shift,
  type CancelReason,
  type CredentialSummary,
  type TimesheetRow,
  type NoParams,
  type ShiftParams,
}

import * as s from "@lib/json/schema"

import { Id } from "@lib/id"
import { schema_actor } from "@lib/actor"
import { CommandEndpoint, PlainEndpoint, QueryEndpoint, UploadEndpoint } from "@lib/endpoint"
import { DateOnly } from "@lib/time"

// The login reply's user, as FR-1.1 sends it.
const schema_user = s.object({
  id: Id.schema<"User">(),
  name: s.string,
  role: s.stringEnum(["nurse", "agency", "admin"]),
})
type User = s.Infer<typeof schema_user>

// Technical spec: "Every route that returns a shift ... returns the same shape". Strings exactly as the API sends them (time.md).
const shift_fields = {
  id: s.string,
  agencyId: s.string,
  agencyName: s.string,
  role: s.stringEnum(["RN", "LPN"]),
  date: s.string,
  startTime: s.string,
  endTime: s.string,
  status: s.stringEnum(["open", "filled"]), // never "cancelled" (FR-6.9)
  claimedBy: s.nullable(s.string),
}
const schema_shift = s.object(shift_fields)
type Shift = s.Infer<typeof schema_shift>

const schema_cancel_reason = s.stringEnum(["no-show", "advance"])
type CancelReason = s.Infer<typeof schema_cancel_reason>

// FR-7.5: the approved date with its state, and the latest upload with its review status.
const schema_credential = s.object({
  approved: s.nullable(s.object({ expiresOn: DateOnly.schema, state: s.stringEnum(["valid", "expired"]) })),
  latest: s.nullable(
    s.object({
      id: s.string,
      expiresOn: DateOnly.schema,
      status: s.stringEnum(["pending", "approved", "rejected"]),
      fileName: s.string,
    })
  ),
})
type CredentialSummary = s.Infer<typeof schema_credential>

// FR-9.1: filled shifts only, with scheduled hours worked out on the server (FR-9.2).
const schema_timesheet_row = s.object({
  shiftId: s.string,
  nurseId: s.string,
  nurseName: s.string,
  agencyId: s.string,
  agencyName: s.string,
  date: s.string,
  startTime: s.string,
  endTime: s.string,
  hours: s.number,
})
type TimesheetRow = s.Infer<typeof schema_timesheet_row>

type NoParams = Record<string, never>
type ShiftParams = { id: string }
const shiftPath =
  (action: "claim" | "cancel") =>
  ({ id }: ShiftParams): string =>
    `/api/shifts/${encodeURIComponent(id)}/${action}`

const api = {
  login: new PlainEndpoint({
    path: "/api/auth/login",
    request: s.object({ email: s.string, password: s.string }),
    response: s.object({ token: s.string, user: schema_user }),
  }),
  whoAmI: new QueryEndpoint({ path: (_: NoParams) => "/api/auth/me", response: s.object({ actor: schema_actor }) }),
  logout: new PlainEndpoint({ path: "/api/auth/logout", request: s.object({}), response: s.object({}) }),
  listShifts: new QueryEndpoint({
    path: (_: NoParams) => "/api/shifts",
    response: s.object({ shifts: s.array(schema_shift) }),
  }),
  claimShift: new CommandEndpoint({ path: shiftPath("claim"), request: s.object({}), response: schema_shift }),
  cancelShift: new CommandEndpoint({
    path: shiftPath("cancel"),
    request: s.object({ reason: schema_cancel_reason }),
    response: s.object({
      ...shift_fields,
      cancellation: s.object({ reason: schema_cancel_reason, previousNurseId: s.string }),
    }),
  }),
  credential: new QueryEndpoint({ path: (_: NoParams) => "/api/credentials/me", response: schema_credential }),
  uploadCredential: new UploadEndpoint({
    path: "/api/credentials",
    contentTypes: ["application/pdf", "image/png", "image/jpeg"],
    maxBytes: 4 * 1024 * 1024,
    response: schema_credential,
  }),
  timesheet: new QueryEndpoint({
    path: (_: NoParams) => "/api/timesheet",
    response: s.object({ rows: s.array(schema_timesheet_row) }),
  }),
}
