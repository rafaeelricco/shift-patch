import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react"

const ADMIN = { id: "admin-1", name: "Alex Kim", role: "admin" }
const QUEUE = "/api/admin/credentials"
const UPLOAD = {
  id: "upload-1",
  nurseName: "James Cook",
  expiresOn: "2031-01-01",
  uploadedAt: 1_800_000_000_000,
  fileName: "sample-renewal.pdf",
}
const REVIEW = `${QUEUE}/${UPLOAD.id}/review`
const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), { status })
const region = () => within(screen.getByRole("region", { name: "Credential review" }))

/** Keep the real session, endpoint decoders and page; control only network replies. */
async function visit(reply: (path: string, init?: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn<typeof fetch>(async (input, init) => {
    const path = String(input)
    if (path === "/api/auth/me") return json({ actor: { type: "User", ...ADMIN } })
    if (path === "/api/admin/shifts") return json({ shifts: [] })
    if (path === "/api/admin/audit") return json({ entries: [] })
    if (path === "/api/timesheet") return json({ rows: [] })
    return reply(path, init)
  })
  vi.stubGlobal("fetch", fetchMock)
  vi.resetModules()
  const { default: Page } = await import("@/app/page")
  await act(async () => {
    render(<Page />)
  })
  return fetchMock
}

beforeEach(() => window.localStorage.setItem("session", JSON.stringify(ADMIN)))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

it("loads the review queue, offers retry after failure, and explains an empty result", async () => {
  const pending = Promise.withResolvers<Response>()
  let reads = 0
  await visit(async (path) => {
    if (path !== QUEUE) throw new Error(`Unexpected request: ${path}`)
    reads += 1
    return reads === 1 ? pending.promise : json({ uploads: [] })
  })
  expect(region().getByText("Loading pending credentials")).toBeTruthy()
  expect(region().queryByRole("button", { name: /Approve credential/ })).toBeNull()

  await act(async () => {
    pending.reject(new TypeError("offline"))
  })
  expect(region().getByText("Couldn't load pending credentials")).toBeTruthy()
  await act(async () => {
    fireEvent.click(region().getByRole("button", { name: "Try again" }))
  })
  expect(reads).toBe(2)
  expect(region().getByText("No credentials to review")).toBeTruthy()
})

it("lists the oldest submission first and links to its protected document", async () => {
  const later = { ...UPLOAD, id: "upload-2", nurseName: "Maria Lopez", uploadedAt: UPLOAD.uploadedAt + 60_000 }
  await visit(async () => json({ uploads: [later, UPLOAD] }))

  const rows = region().getAllByRole("row")
  expect(rows[1]?.textContent).toContain("James Cook")
  expect(rows[2]?.textContent).toContain("Maria Lopez")
  expect(region().getAllByText(UPLOAD.expiresOn)).toHaveLength(2)
  const link = region().getByRole("link", { name: "View document for James Cook" })
  expect(link.getAttribute("href")).toBe(`/api/credentials/uploads/${UPLOAD.id}/document`)
  expect(link.getAttribute("target")).toBe("_blank")
  expect(link.getAttribute("rel")).toContain("noopener")

  const nurseSort = within(region().getByRole("columnheader", { name: /^Nurse/ })).getByRole("button", {
    name: "Toggle sort",
  })
  fireEvent.click(nurseSort)
  expect(region().getAllByRole("row")[1]?.textContent).toContain("James Cook")
  fireEvent.click(nurseSort)
  expect(region().getAllByRole("row")[1]?.textContent).toContain("Maria Lopez")
})

it.each([
  { decision: "approved", action: "Approve", opposite: "Reject", message: "Credential approved" },
  { decision: "rejected", action: "Reject", opposite: "Approve", message: "Credential rejected" },
])(
  "makes $decision single-flight and removes the row only after success",
  async ({ decision, action, opposite, message }) => {
    const review = Promise.withResolvers<Response>()
    let reads = 0
    const fetchMock = await visit(async (path) => {
      if (path === REVIEW) return review.promise
      if (path === QUEUE) {
        reads += 1
        if (reads === 1) return json({ uploads: [UPLOAD] })
        throw new TypeError("offline") // accepted review must survive a failed queue refresh
      }
      throw new Error(`Unexpected request: ${path}`)
    })
    const first = region().getByRole<HTMLButtonElement>("button", { name: `${action} credential for James Cook` })
    const second = region().getByRole<HTMLButtonElement>("button", { name: `${opposite} credential for James Cook` })

    // Dispatch before React commits disabled state: the shared key must guard both actions synchronously.
    await act(async () => {
      fireEvent.click(first)
      fireEvent.click(second)
      fireEvent.click(first)
    })
    expect(first.disabled).toBe(true)
    expect(second.disabled).toBe(true)
    expect(region().getByText(UPLOAD.fileName)).toBeTruthy()
    expect(screen.queryByTestId("notification-banner")).toBeNull()
    const writes = fetchMock.mock.calls.filter(([path]) => path === REVIEW)
    expect(writes).toHaveLength(1)
    expect(writes[0]?.[1]).toMatchObject({ method: "POST", body: JSON.stringify({ decision }) })

    await act(async () => {
      review.resolve(json({ id: UPLOAD.id, status: decision }))
    })
    expect(reads).toBe(2)
    expect(region().queryByText(UPLOAD.fileName)).toBeNull()
    expect(region().getByText("No credentials to review")).toBeTruthy()
    expect(region().getByText(/Couldn't refresh, showing/)).toBeTruthy()
    expect(screen.getAllByTestId("notification-banner")).toHaveLength(1)
    expect(screen.getByTestId("notification-banner").textContent).toBe(message)
  }
)

it.each([
  { status: 404, error: "Credential upload not found" },
  { status: 409, error: "Credential already reviewed" },
])("refreshes a stale queue after a $status review response and shows its error", async ({ status, error }) => {
  let reads = 0
  await visit(async (path) => {
    if (path === REVIEW) return json({ error }, status)
    if (path === QUEUE) return json({ uploads: ++reads === 1 ? [UPLOAD] : [] })
    throw new Error(`Unexpected request: ${path}`)
  })
  await act(async () => {
    fireEvent.click(region().getByRole("button", { name: "Approve credential for James Cook" }))
  })
  expect(reads).toBe(2)
  expect(region().getByText("No credentials to review")).toBeTruthy()
  expect(screen.getAllByTestId("notification-banner")).toHaveLength(1)
  expect(screen.getByTestId("notification-banner").textContent).toBe(error)
})

it("keeps an unreviewed upload and re-enables both decisions after a server error", async () => {
  let attempts = 0
  let reviewed = false
  await visit(async (path) => {
    if (path === QUEUE) return json({ uploads: reviewed ? [] : [UPLOAD] })
    if (path === REVIEW) {
      attempts += 1
      if (attempts === 1) return json({ error: "Review could not be saved" }, 500)
      reviewed = true
      return json({ id: UPLOAD.id, status: "rejected" })
    }
    throw new Error(`Unexpected request: ${path}`)
  })
  await act(async () => {
    fireEvent.click(region().getByRole("button", { name: "Approve credential for James Cook" }))
  })
  expect(screen.getByTestId("notification-banner").textContent).toBe("Couldn't review credential, try again")
  expect(region().getByText(UPLOAD.fileName)).toBeTruthy()
  expect(region().getByRole<HTMLButtonElement>("button", { name: "Approve credential for James Cook" }).disabled).toBe(
    false
  )
  expect(region().getByRole<HTMLButtonElement>("button", { name: "Reject credential for James Cook" }).disabled).toBe(
    false
  )

  await act(async () => {
    fireEvent.click(region().getByRole("button", { name: "Reject credential for James Cook" }))
  })
  expect(attempts).toBe(2)
  expect(screen.getByTestId("notification-banner").textContent).toBe("Credential rejected")
  expect(region().getByText("No credentials to review")).toBeTruthy()
})

it("retains pending rows with a stale indicator when polling fails", async () => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] })
  let reads = 0
  await visit(async (path) => {
    if (path !== QUEUE) throw new Error(`Unexpected request: ${path}`)
    if (++reads === 1) return json({ uploads: [UPLOAD] })
    throw new TypeError("offline")
  })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(3000)
  })
  expect(reads).toBe(2)
  expect(region().getByText(UPLOAD.fileName)).toBeTruthy()
  expect(region().getByText(/Couldn't refresh, showing/)).toBeTruthy()
})
