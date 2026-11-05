import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"

const AGENCY = { id: "agency-a", name: "Sunrise Health Staffing", role: "agency" }
const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 })
const SHIFTS = `/api/agencies/${AGENCY.id}/shifts`
const base = {
  id: "shift-1",
  agencyId: AGENCY.id,
  agencyName: AGENCY.name,
  role: "RN",
  date: "2030-10-01",
  startTime: "07:00",
  endTime: "15:00",
  status: "filled",
}
const row = (nurseId: string, nurseName: string) => ({
  shiftId: "shift-1",
  nurseId,
  nurseName,
  agencyId: AGENCY.id,
  agencyName: AGENCY.name,
  date: "2030-10-01",
  startTime: "07:00",
  endTime: "15:00",
  hours: 8,
})

beforeEach(() => window.localStorage.setItem("session", JSON.stringify(AGENCY)))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

it("names the covering nurse only while the timesheet row matches the current claim", async () => {
  vi.useFakeTimers()
  let phase = 1
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (path) => {
      if (path === "/api/auth/me") return json({ actor: { type: "User", ...AGENCY } })
      if (path === SHIFTS)
        return json({ agencyId: AGENCY.id, shifts: [{ ...base, claimedBy: phase === 1 ? "nurse-a" : "nurse-b" }] })
      if (path === "/api/timesheet") {
        if (phase === 1) return json({ rows: [row("nurse-a", "Nurse A")] })
        throw new TypeError("offline") // timesheet read fails while the shifts read succeeds
      }
      throw new Error(`Unexpected request: ${String(path)}`)
    })
  )
  vi.resetModules()
  const { default: Page } = await import("@/app/page")
  await act(async () => {
    render(<Page />)
  })
  expect(screen.getByText("Covered by Nurse A")).toBeTruthy()

  phase = 2 // nurse A's claim was cancelled and nurse B reclaimed shift-1
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000)
  })

  // The shifts poll now says claimedBy=nurse-b; the card must not say Nurse A covers it.
  expect(screen.queryByText("Covered by Nurse A")).toBeNull()
  expect(screen.getByText("Covered by a nurse")).toBeTruthy()
})
