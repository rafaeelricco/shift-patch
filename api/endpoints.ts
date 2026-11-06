export {
  api,
  schema_user,
  schema_shift,
  schema_cancel_reason,
  schema_new_shift,
  type User,
  type Shift,
  type NewShift,
  type AdminShift,
  type AuditEntry,
  type CancelReason,
  type CredentialSummary,
  type PendingCredential,
  type CredentialDecision,
  type TimesheetRow,
  type NoParams,
  type ShiftParams,
  type AgencyParams,
}

import * as s from "@lib/json/schema"

import { Id } from "@lib/id"
import { schema_actor } from "@lib/actor"
import { CommandEndpoint, PlainEndpoint, QueryEndpoint, UploadEndpoint } from "@lib/endpoint"
import { DateOnly, POSIX } from "@lib/time"
import { always, fail } from "@lib/json/decoder"
import { Success } from "@lib/result"

// The login reply's user, as FR-1.1 sends it.
const schema_user = s.object({
  id: Id.schema<"User">(),
  name: s.string,
  role: s.stringEnum(["nurse", "agency", "admin"]),
})
type User = s.Infer<typeof schema_user>

// Technical spec: "Every route that returns a shift ... returns the same shape". Strings exactly as the API sends them (time.md).
const shift_fields = {
  id: Id.schema<"Shift">(),
  agencyId: Id.schema<"User">(),
  agencyName: s.string,
  role: s.stringEnum(["RN", "LPN"]),
  date: s.string,
  startTime: s.string,
  endTime: s.string,
  status: s.stringEnum(["open", "filled"]), // never "cancelled" (FR-6.9)
  claimedBy: s.nullable(Id.schema<"User">()),
}
const schema_shift = s.object(shift_fields)
type Shift = s.Infer<typeof schema_shift>

const schema_cancel_reason = s.stringEnum(["no-show", "advance"])
type CancelReason = s.Infer<typeof schema_cancel_reason>

// FR-2.4: a real YYYY-MM-DD date (2026-02-30 fails) and 24-hour HH:mm times. Both stay strings on the wire (time.md).
// Year 0000 passes Luxon but Postgres DATE has no year zero, so it is rejected here rather than as a 500.
const schema_shift_date = s.string.chain(
  (str) => {
    const date = s.decode(DateOnly.schema, str)
    return date instanceof Success && date.value.year >= 1 ? always(str) : fail<string>("Invalid date")
  },
  (str) => str
)
const schema_clock = s.string.chain(
  (str) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(str) ? always(str) : fail<string>("Invalid time")),
  (str) => str
)
// FR-2.2: s.object ignores extra keys, so a body `agencyId` is dropped here. Start and end differing is the route's check.
const schema_new_shift = s.object({
  role: s.stringEnum(["RN", "LPN"]),
  date: schema_shift_date,
  startTime: schema_clock,
  endTime: schema_clock,
})
type NewShift = s.Infer<typeof schema_new_shift>

// FR-7.5: the approved date with its state, and the latest upload with its review status.
const schema_credential = s.object({
  approved: s.nullable(s.object({ expiresOn: DateOnly.schema, state: s.stringEnum(["valid", "expired"]) })),
  latest: s.nullable(
    s.object({
      id: Id.schema<"CredentialUpload">(),
      expiresOn: DateOnly.schema,
      status: s.stringEnum(["pending", "approved", "rejected"]),
      fileName: s.string,
    })
  ),
})
type CredentialSummary = s.Infer<typeof schema_credential>

const schema_credential_decision = s.stringEnum(["approved", "rejected"])
type CredentialDecision = s.Infer<typeof schema_credential_decision>

const schema_pending_credential = s.object({
  id: Id.schema<"CredentialUpload">(),
  nurseName: s.string,
  fileName: s.string,
  expiresOn: DateOnly.schema,
  uploadedAt: POSIX.schema,
})
type PendingCredential = s.Infer<typeof schema_pending_credential>

// FR-9.1: filled shifts only, with scheduled hours worked out on the server (FR-9.2).
const schema_timesheet_row = s.object({
  shiftId: Id.schema<"Shift">(),
  nurseId: Id.schema<"User">(),
  nurseName: s.string,
  agencyId: Id.schema<"User">(),
  agencyName: s.string,
  date: s.string,
  startTime: s.string,
  endTime: s.string,
  hours: s.number,
})
type TimesheetRow = s.Infer<typeof schema_timesheet_row>

// FR-5.1: the admin's coverage row, the full shift shape plus who covers it. Admin-only, so GET /api/shifts keeps
// its exact keys (NFR-1).
const schema_admin_shift = s.object({ ...shift_fields, nurseName: s.nullable(s.string) })
type AdminShift = s.Infer<typeof schema_admin_shift>

// FR-8.1 and FR-6.6: one audit_log row with its names resolved. The actor is null for the operator seed reset.
const schema_audit_entry = s.object({
  id: Id.schema<"AuditEntry">(),
  at: POSIX.schema,
  actorId: s.nullable(Id.schema<"User">()),
  actorName: s.nullable(s.string),
  action: s.string,
  recordId: s.string,
  reason: s.nullable(s.string),
  previousNurseId: s.nullable(Id.schema<"User">()),
  previousNurseName: s.nullable(s.string),
})
type AuditEntry = s.Infer<typeof schema_audit_entry>

type NoParams = Record<string, never>
type ShiftParams = { id: Shift["id"] }
type AgencyParams = { agencyId: User["id"] }
const shiftPath =
  (action: "claim" | "cancel") =>
  ({ id }: ShiftParams): string =>
    `/api/shifts/${encodeURIComponent(id.value)}/${action}`

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
  postShift: new PlainEndpoint({ path: "/api/shifts", request: schema_new_shift, response: schema_shift }),
  // FR-2.8: the full shift shape, exactly { agencyId, shifts } (NFR-1).
  agencyShifts: new QueryEndpoint({
    path: ({ agencyId }: AgencyParams) => `/api/agencies/${encodeURIComponent(agencyId.value)}/shifts`,
    response: s.object({ agencyId: Id.schema<"User">(), shifts: s.array(schema_shift) }),
  }),
  claimShift: new CommandEndpoint({ path: shiftPath("claim"), request: s.object({}), response: schema_shift }),
  cancelShift: new CommandEndpoint({
    path: shiftPath("cancel"),
    request: s.object({ reason: schema_cancel_reason }),
    response: s.object({
      ...shift_fields,
      cancellation: s.object({ reason: schema_cancel_reason, previousNurseId: Id.schema<"User">() }),
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
  adminShifts: new QueryEndpoint({
    path: (_: NoParams) => "/api/admin/shifts",
    response: s.object({ shifts: s.array(schema_admin_shift) }),
  }),
  pendingCredentials: new QueryEndpoint({
    path: (_: NoParams) => "/api/admin/credentials",
    response: s.object({ uploads: s.array(schema_pending_credential) }),
  }),
  reviewCredential: new CommandEndpoint({
    path: ({ id }: { id: PendingCredential["id"] }) => `/api/admin/credentials/${encodeURIComponent(id.value)}/review`,
    request: s.object({ decision: schema_credential_decision }),
    response: s.object({ id: Id.schema<"CredentialUpload">(), status: schema_credential_decision }),
  }),
  auditLog: new QueryEndpoint({
    path: (_: NoParams) => "/api/admin/audit",
    response: s.object({ entries: s.array(schema_audit_entry) }),
  }),
}
