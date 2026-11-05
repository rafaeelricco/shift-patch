import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"

import { HoldButton } from "@ui/hold-button"

beforeEach(() => vi.useFakeTimers())

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))

describe("HoldButton", () => {
  it.each(["Enter", " "])("fires once per continuous %j hold and rearms after release", (key) => {
    const onHold = vi.fn()
    render(
      <HoldButton holdMs={100} onHold={onHold}>
        Confirm
      </HoldButton>
    )
    const button = screen.getByRole("button", { name: "Confirm" })

    fireEvent.keyDown(button, { key })
    advance(50)
    fireEvent.keyDown(button, { key, repeat: true })
    advance(50)
    expect(onHold).toHaveBeenCalledTimes(1)

    for (let i = 0; i < 3; i++) {
      fireEvent.keyDown(button, { key, repeat: true })
      advance(100)
    }
    expect(onHold).toHaveBeenCalledTimes(1)

    fireEvent.keyUp(button, { key })
    fireEvent.keyDown(button, { key })
    advance(100)
    expect(onHold).toHaveBeenCalledTimes(2)
  })

  it.each(["Enter", " "])("cancels a %j hold released before the threshold", (key) => {
    const onHold = vi.fn()
    render(
      <HoldButton holdMs={100} onHold={onHold}>
        Confirm
      </HoldButton>
    )
    const button = screen.getByRole("button", { name: "Confirm" })

    fireEvent.keyDown(button, { key })
    advance(99)
    fireEvent.keyUp(button, { key })
    advance(100)
    expect(onHold).not.toHaveBeenCalled()
  })

  it("fires once per pointer hold and cancels an early release", () => {
    const onHold = vi.fn()
    render(
      <HoldButton holdMs={100} onHold={onHold}>
        Confirm
      </HoldButton>
    )
    const button = screen.getByRole("button", { name: "Confirm" })

    fireEvent.pointerDown(button)
    advance(99)
    fireEvent.pointerUp(button)
    advance(100)
    expect(onHold).not.toHaveBeenCalled()

    fireEvent.pointerDown(button)
    advance(300)
    expect(onHold).toHaveBeenCalledTimes(1)
    fireEvent.pointerUp(button)
    fireEvent.pointerDown(button)
    advance(100)
    expect(onHold).toHaveBeenCalledTimes(2)
  })

  it("cancels a pending hold on unmount", () => {
    const onHold = vi.fn()
    const { unmount } = render(
      <HoldButton holdMs={100} onHold={onHold}>
        Confirm
      </HoldButton>
    )
    fireEvent.keyDown(screen.getByRole("button", { name: "Confirm" }), { key: "Enter" })
    advance(99)
    unmount()
    advance(100)
    expect(onHold).not.toHaveBeenCalled()
  })
})
