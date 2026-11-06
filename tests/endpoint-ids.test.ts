import { expect, expectTypeOf, it } from "vitest"

import { api, schema_shift, type Shift } from "@api/endpoints"
import { Id } from "@lib/id"
import * as s from "@lib/json/schema"

function roundTrip<T>(schema: s.Schema<T>, wire: unknown): T {
  const value = s.decode(schema, wire).unwrap((error) => error)
  expect(s.encode(schema, value)).toEqual(wire)
  return value
}

const shift = {
  id: "shift /1",
  agencyId: "agency-a",
  agencyName: "Sunrise Health Staffing",
  role: "RN",
  date: "2026-10-03",
  startTime: "19:00",
  endTime: "07:00",
  status: "filled",
  claimedBy: "nurse-1",
}

it("decodes entity IDs while preserving every shift response's wire shape", () => {
  const value = roundTrip(schema_shift, shift)
  expect(value.id).toBeInstanceOf(Id)
  expect(value.id.value).toBe(shift.id)
  expectTypeOf(value.id).toEqualTypeOf<Id<"Shift">>()
  expectTypeOf(value.agencyId).toEqualTypeOf<Id<"User">>()
  expectTypeOf(value.claimedBy).toEqualTypeOf<Id<"User"> | null>()
  roundTrip(api.listShifts.response, { shifts: [shift] })
  roundTrip(api.agencyShifts.response, { agencyId: "agency-a", shifts: [shift] })
  roundTrip(api.adminShifts.response, { shifts: [{ ...shift, nurseName: "Maria Lopez" }] })
  roundTrip(api.cancelShift.response, {
    ...shift,
    status: "open",
    claimedBy: null,
    cancellation: { reason: "advance", previousNurseId: "nurse-1" },
  })
})

it("round-trips credential, timesheet and audit identities without changing JSON", () => {
  const credential = roundTrip(api.credential.response, {
    approved: { expiresOn: "2027-01-01", state: "valid" },
    latest: { id: "upload-1", expiresOn: "2027-01-01", status: "pending", fileName: "sample.pdf" },
  })
  expectTypeOf(credential.latest!.id).toEqualTypeOf<Id<"CredentialUpload">>()
  const pending = roundTrip(api.pendingCredentials.response, {
    uploads: [
      {
        id: "upload-1",
        nurseName: "Maria Lopez",
        fileName: "sample.pdf",
        expiresOn: "2027-01-01",
        uploadedAt: 1794000000000,
      },
    ],
  })
  expectTypeOf(pending.uploads[0]!.id).toEqualTypeOf<Id<"CredentialUpload">>()
  roundTrip(api.reviewCredential.response, { id: "upload-1", status: "approved" })
  const timesheet = roundTrip(api.timesheet.response, {
    rows: [
      {
        shiftId: "shift-1",
        nurseId: "nurse-1",
        nurseName: "Maria Lopez",
        agencyId: "agency-a",
        agencyName: "Sunrise Health Staffing",
        date: "2026-10-03",
        startTime: "19:00",
        endTime: "07:00",
        hours: 12,
      },
    ],
  })
  expectTypeOf(timesheet.rows[0]!.shiftId).toEqualTypeOf<Id<"Shift">>()
  expectTypeOf(timesheet.rows[0]!.nurseId).toEqualTypeOf<Id<"User">>()
  const audit = roundTrip(api.auditLog.response, {
    entries: [
      {
        id: "1",
        at: 1794000000000,
        actorId: "agency-a",
        actorName: "Sunrise Health Staffing",
        action: "shift.cancelled",
        recordId: "shift-1",
        reason: "advance",
        previousNurseId: "nurse-1",
        previousNurseName: "Maria Lopez",
      },
    ],
  })
  expectTypeOf(audit.entries[0]!.id).toEqualTypeOf<Id<"AuditEntry">>()
  expectTypeOf(audit.entries[0]!.actorId).toEqualTypeOf<Id<"User"> | null>()
  expectTypeOf(audit.entries[0]!.previousNurseId).toEqualTypeOf<Id<"User"> | null>()
  expectTypeOf(audit.entries[0]!.recordId).toEqualTypeOf<string>()
})

it("encodes raw IDs in paths and rejects another entity's tag at compile time", () => {
  const id = new Id<"Shift">("shift /1")
  expect(api.claimShift.path({ id })).toBe("/api/shifts/shift%20%2F1/claim")
  expect(api.cancelShift.path({ id })).toBe("/api/shifts/shift%20%2F1/cancel")
  expect(api.agencyShifts.path({ agencyId: new Id<"User">("agency /1") })).toBe("/api/agencies/agency%20%2F1/shifts")
  expect(api.reviewCredential.path({ id: new Id<"CredentialUpload">("upload /1") })).toBe(
    "/api/admin/credentials/upload%20%2F1/review"
  )
  expectTypeOf<Id<"User">>().not.toExtend<Shift["id"]>()
  // @ts-expect-error User IDs cannot identify a shift.
  api.claimShift.path({ id: new Id<"User">("nurse-1") })
  // @ts-expect-error Shift IDs cannot identify a credential upload.
  api.reviewCredential.path({ id })
  // @ts-expect-error Raw strings must be decoded or wrapped at the boundary.
  api.agencyShifts.path({ agencyId: "agency-a" })
})
