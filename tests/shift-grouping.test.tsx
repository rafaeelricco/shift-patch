import { afterEach, expect, it, vi } from "vitest"
import { act, cleanup, render, screen } from "@testing-library/react"

const shifts = [
  { id: "old", date: "2026-11-03", startTime: "07:00" },
  { id: "tomorrow-late", date: "2026-11-07", startTime: "19:00" },
  { id: "recent", date: "2026-11-05", startTime: "07:00" },
  { id: "today", date: "2026-11-06", startTime: "07:00" },
  { id: "future", date: "2026-11-09", startTime: "07:00" },
  { id: "tomorrow-early", date: "2026-11-07", startTime: "07:00" },
].map((shift) => ({
  ...shift,
  agencyId: "agency-a",
  agencyName: shift.id,
  role: "RN",
  endTime: "23:00",
  status: "open",
  claimedBy: null,
}))

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

it.each([
  { role: "nurse", mine: false, order: ["today", "tomorrow-early", "tomorrow-late", "future", "recent", "old"] },
  { role: "agency", mine: false, order: ["today", "tomorrow-early", "tomorrow-late", "future", "recent", "old"] },
  { role: "nurse", mine: true, order: ["future", "tomorrow-late", "tomorrow-early", "today", "recent", "old"] },
])("preserves day and within-day ordering on the $role screen (claimed: $mine)", async ({ role, mine, order }) => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date("2026-11-06T03:30:00Z"))
  const user = { id: role === "agency" ? "agency-a" : "nurse-1", name: "Test account", role }
  window.localStorage.setItem("session", JSON.stringify(user))
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>(async (path) => {
      const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 })
      if (path === "/api/auth/me") return json({ actor: { type: "User", ...user } })
      if (path === "/api/shifts")
        return json({
          shifts: mine ? shifts.map((shift) => ({ ...shift, status: "filled", claimedBy: user.id })) : shifts,
        })
      if (path === "/api/agencies/agency-a/shifts") return json({ agencyId: "agency-a", shifts })
      if (path === "/api/credentials/me") return json({ approved: null, latest: null })
      if (path === "/api/timesheet") return json({ rows: [] })
      throw new Error(`Unexpected request: ${String(path)}`)
    })
  )
  vi.resetModules()
  const { default: Page } = await import("@/app/page")
  await act(async () => {
    render(<Page />)
  })
  const rows =
    role === "agency" ? Array.from(document.querySelectorAll("[data-row]"))
    : mine ? Array.from(document.querySelectorAll("[data-mine]"))
    : screen.getAllByTestId("shift-list-item")
  expect(rows).toHaveLength(order.length)
  for (const [index, id] of order.entries()) {
    const expected = shifts.find((shift) => shift.id === id)!
    if (role === "agency") expect(rows[index]!.getAttribute("data-row")).toBe(id)
    else if (mine) expect(rows[index]!.getAttribute("data-mine")).toBe(id)
    else expect(rows[index]!.textContent).toContain(expected.agencyName)
    expect(rows[index]!.textContent).toContain(expected.startTime)
  }
})
