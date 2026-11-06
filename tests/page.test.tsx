import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

const NURSE_A = { id: "nurse-a", name: "Nurse A", role: "nurse" }
const NURSE_B = { id: "nurse-b", name: "Nurse B", role: "nurse" }
const CREDENTIAL_A = { approved: { expiresOn: "2030-10-15", state: "valid" }, latest: null }
const PRIVATE_ROW = "Nurse A private scheduled hours"
const ME = "/api/auth/me"
const UPLOAD = "/api/credentials"
const READS = ["/api/shifts", "/api/credentials/me", "/api/timesheet"]

const json = (body: unknown): Response => new Response(JSON.stringify(body), { status: 200 })
const me = (user: typeof NURSE_A): Response => json({ actor: { type: "User", ...user } })

function firstAccountReply(path: RequestInfo | URL): Response {
  switch (path) {
    case ME:
      return me(NURSE_A)
    case "/api/shifts":
      return json({ shifts: [] })
    case "/api/credentials/me":
      return json(CREDENTIAL_A)
    case "/api/timesheet":
      return json({
        rows: [
          {
            shiftId: "private-a",
            nurseId: NURSE_A.id,
            nurseName: PRIVATE_ROW,
            agencyId: "agency-1",
            agencyName: "Agency",
            date: "2030-10-01",
            startTime: "07:00",
            endTime: "15:00",
            hours: 8,
          },
        ],
      })
    default:
      throw new Error(`Unexpected request: ${String(path)}`)
  }
}

/** Load a fresh session store, with the actual page and request layer. */
async function visit() {
  vi.resetModules()
  const { default: Page } = await import("@/app/page")
  await act(async () => {
    render(<Page />)
  })
  expect(screen.getByText(PRIVATE_ROW)).toBeTruthy()
  expect(screen.getByText("Oct 15, 2030")).toBeTruthy()
}

function switchStorage() {
  const next = JSON.stringify(NURSE_B)
  window.localStorage.setItem("session", next)
  window.dispatchEvent(
    new StorageEvent("storage", { key: "session", newValue: next, storageArea: window.localStorage })
  )
}

function fillRenewal() {
  fireEvent.click(screen.getByRole("button", { name: "Upload a renewal" }))
  fireEvent.change(screen.getByTestId("credential-expiry-date-input"), { target: { value: "2030-11-01" } })
  fireEvent.change(screen.getByTestId("credential-upload-input"), {
    target: { files: [new File(["sample"], "nurse-a.pdf", { type: "application/pdf" })] },
  })
}

function expectFreshAccount() {
  expect(screen.getAllByRole("button", { name: "Account: Nurse B, nurse" })).toHaveLength(2)
  expect(screen.queryByText(PRIVATE_ROW)).toBeNull()
  expect(screen.queryByText("Oct 15, 2030")).toBeNull()
  expect(screen.getByTestId<HTMLInputElement>("credential-expiry-date-input").value).toBe("")
  expect(screen.getByTestId<HTMLInputElement>("credential-upload-input").files).toHaveLength(0)
}

beforeEach(() => window.localStorage.setItem("session", JSON.stringify(NURSE_A)))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  window.localStorage.clear()
})

describe("account state on the page", () => {
  it.each(["storage", "/me"] as const)("clears private state when %s replaces the account", async (source) => {
    const identity = Promise.withResolvers<Response>()
    const nextReads = Promise.withResolvers<Response>()
    let switched = false
    const fetchMock = vi.fn<typeof fetch>(async (path) => {
      if (path === ME && source === "/me") return identity.promise
      return switched ? nextReads.promise : firstAccountReply(path)
    })
    vi.stubGlobal("fetch", fetchMock)
    await visit()
    fillRenewal()

    await act(async () => {
      switched = true
      if (source === "storage") switchStorage()
      else identity.resolve(me(NURSE_B))
    })

    // B's reads have started but have not settled: A's data must already be gone.
    for (const path of READS) expect(fetchMock.mock.calls.filter(([url]) => url === path)).toHaveLength(2)
    expectFreshAccount()
    expect(screen.getByText("Loading your credential")).toBeTruthy()
    expect(screen.getByText("Loading scheduled hours")).toBeTruthy()

    await act(async () => {
      nextReads.reject(new TypeError("offline"))
    })

    expectFreshAccount()
    expect(screen.getByText("Couldn't load your credential")).toBeTruthy()
    expect(screen.getByText("Couldn't load scheduled hours")).toBeTruthy()
    expect(screen.queryByText(/Couldn't refresh, showing/)).toBeNull()
  })

  it("keeps the same account's last good data and renewal draft when a poll fails", async () => {
    vi.useFakeTimers()
    let offline = false
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async (path) => {
        if (offline) throw new TypeError("offline")
        return firstAccountReply(path)
      })
    )
    await visit()
    fillRenewal()
    offline = true

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })

    expect(screen.getByText(PRIVATE_ROW)).toBeTruthy()
    expect(screen.getByText("Oct 15, 2030")).toBeTruthy()
    expect(screen.getAllByText(/Couldn't refresh, showing/)).toHaveLength(4)
    expect(screen.getByTestId<HTMLInputElement>("credential-expiry-date-input").value).toBe("2030-11-01")
    expect(screen.getByTestId<HTMLInputElement>("credential-upload-input").files?.[0]?.name).toBe("nurse-a.pdf")
  })

  it("aborts the previous account's upload and ignores its late response", async () => {
    const uploading = Promise.withResolvers<Response>()
    const nextReads = Promise.withResolvers<Response>()
    let switched = false
    const fetchMock = vi.fn<typeof fetch>(async (path) => {
      if (path === UPLOAD) return uploading.promise
      return switched ? nextReads.promise : firstAccountReply(path)
    })
    vi.stubGlobal("fetch", fetchMock)
    await visit()
    fillRenewal()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Submit for review" }))
    })
    const signal = fetchMock.mock.calls.find(([path]) => path === UPLOAD)?.[1]?.signal
    expect(signal?.aborted).toBe(false)
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Submit for review" }).disabled).toBe(true)

    await act(async () => {
      switched = true
      switchStorage()
    })

    expect(signal?.aborted).toBe(true)
    expectFreshAccount()
    fireEvent.click(screen.getByRole("button", { name: "Upload a credential" }))
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Submit for review" }).disabled).toBe(false)
    fireEvent.change(screen.getByTestId("credential-expiry-date-input"), { target: { value: "2031-01-02" } })
    const requestCount = fetchMock.mock.calls.length

    // Deliberately resolve even after abort, as if an old response was already queued.
    await act(async () => {
      uploading.resolve(json(CREDENTIAL_A))
    })

    expect(screen.queryByTestId("notification-banner")).toBeNull()
    expect(screen.getByTestId<HTMLInputElement>("credential-expiry-date-input").value).toBe("2031-01-02")
    expect(fetchMock).toHaveBeenCalledTimes(requestCount)
    expect(screen.getByText("Loading your credential")).toBeTruthy()
  })
})

describe("successful shift actions", () => {
  it.each([
    { action: "claim", inverse: "cancel", message: "Shift claimed", focus: '[data-mine="shift-1"]' },
    { action: "cancel", inverse: "claim", message: "Shift cancelled, now open", focus: "#open-title" },
  ])("applies $action and moves focus before the next list response", async ({ action, inverse, message, focus }) => {
    vi.useFakeTimers()
    const open = {
      id: "shift-1",
      agencyId: "agency-1",
      agencyName: "Agency",
      role: "RN",
      date: "2030-10-01",
      startTime: "07:00",
      endTime: "15:00",
      status: "open",
      claimedBy: null,
    }
    const filled = { ...open, status: "filled", claimedBy: NURSE_A.id }
    const initial = action === "claim" ? open : filled
    const updated =
      action === "claim" ? filled : { ...open, cancellation: { reason: "advance", previousNurseId: NURSE_A.id } }
    const preWrite = Promise.withResolvers<Response>()
    const postWrite = Promise.withResolvers<Response>()
    const listPath = "/api/shifts"
    const actionPath = `${listPath}/${open.id}/${action}`
    let reads = 0
    const fetchMock = vi.fn<typeof fetch>(async (path) => {
      if (path === actionPath) return json(updated)
      if (path !== listPath) return firstAccountReply(path)
      reads += 1
      if (reads === 1) return json({ shifts: [initial] })
      return reads === 2 ? preWrite.promise : postWrite.promise
    })
    vi.stubGlobal("fetch", fetchMock)
    await visit()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    const oldRead = fetchMock.mock.calls.filter(([path]) => path === listPath)[1]?.[1]
    expect(oldRead?.signal?.aborted).toBe(false)

    await act(async () => {
      const button = screen.getByTestId(`shift-${action}-button`)
      if (action === "cancel") {
        fireEvent.keyDown(button, { key: " " })
        await vi.advanceTimersByTimeAsync(2000)
      } else {
        fireEvent.click(button)
      }
    })
    // Sonner renders published toasts on its next task.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(reads).toBe(3)
    expect(screen.queryByTestId(`shift-${action}-button`)).toBeNull()
    expect(screen.getByTestId(`shift-${inverse}-button`)).toBeTruthy()
    expect(screen.getByTestId("notification-banner").textContent).toBe(message)
    const focused = document.querySelector(focus)
    expect(focused).toBeTruthy()
    expect(document.activeElement).toBe(focused)
    expect(oldRead?.signal?.aborted).toBe(true)

    await act(async () => {
      preWrite.resolve(json({ shifts: [initial] }))
    })
    expect(screen.queryByTestId(`shift-${action}-button`)).toBeNull()
    expect(screen.getByTestId(`shift-${inverse}-button`)).toBeTruthy()
    expect(screen.getByTestId("notification-banner").textContent).toBe(message)
    expect(fetchMock.mock.calls.filter(([path]) => path === actionPath)).toHaveLength(1)
  })
})
