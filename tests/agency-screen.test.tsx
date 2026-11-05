import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

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
const NEW = {
  id: "shift-new",
  agencyId: AGENCY.id,
  agencyName: AGENCY.name,
  role: "RN",
  date: "2030-10-03",
  startTime: "07:00",
  endTime: "19:00",
  status: "open",
  claimedBy: null,
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

it("a shift the poll already returned is not added twice when the POST answers", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  window.localStorage.setItem("session", JSON.stringify(AGENCY))
  let listCalls = 0
  const post = Promise.withResolvers<Response>()
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = String(input)
    if (path === "/api/auth/me") return json({ actor: { type: "User", ...AGENCY } })
    if (path === "/api/timesheet") return json({ rows: [] })
    if (path === "/api/shifts" && init?.method === "POST") return post.promise
    if (path === SHIFTS) {
      listCalls += 1
      if (listCalls === 1) return json({ agencyId: "agency-a", shifts: [] })
      if (listCalls === 2) return json({ agencyId: "agency-a", shifts: [NEW] }) // poll lands after the insert commits
      throw new TypeError("offline") // the refresh after posted fails
    }
    throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${path}`)
  })
  vi.stubGlobal("fetch", fetchMock)
  vi.resetModules()
  const { default: Page } = await import("@/app/page")
  await act(async () => {
    render(<Page />)
  })
  expect(screen.getByText("No shifts posted yet")).toBeTruthy()

  await act(async () => {
    fireEvent.click(screen.getByTestId("agency-post-shift-button"))
  })
  await act(async () => {
    fireEvent.click(screen.getByTestId("agency-post-shift-submit-button"))
  })
  expect(fetchMock.mock.calls.some(([u, i]) => String(u) === "/api/shifts" && i?.method === "POST")).toBe(true)

  // The 3 s poll runs while the POST is in flight and already sees the new shift.
  await act(async () => {
    vi.advanceTimersByTime(3000)
  })
  expect(listCalls).toBe(2)
  expect(screen.getAllByText("Waiting for a nurse")).toHaveLength(1)

  const errors = vi.spyOn(console, "error").mockImplementation(() => {})
  await act(async () => {
    post.resolve(json(NEW))
  })
  expect(listCalls).toBe(3)
  expect(screen.getByText(/Couldn't refresh, showing/)).toBeTruthy()
  const dupKey = errors.mock.calls.some((args) => String(args[0]).includes("same key"))
  errors.mockRestore()
  expect({ cards: screen.getAllByText("Waiting for a nurse").length, dupKey }).toEqual({ cards: 1, dupKey: false })
})
