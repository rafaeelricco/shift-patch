"use client"

export { HoldButton }

import * as React from "react"

import { cn } from "@lib/utils"
import { Button } from "@ui/button"

/** A button that fires `onHold` only after being held for `holdMs` (pointer, or Space/Enter); releasing early cancels. */
function HoldButton({
  onHold,
  holdMs = 2000,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "onClick"> & {
  readonly onHold: () => void
  readonly holdMs?: number
}) {
  const [holding, setHolding] = React.useState(false)
  // The ref is the re-entrancy guard: key-repeat fires keydown before React re-renders. `holding` only drives the fill.
  const timer = React.useRef<number | undefined>(undefined)

  const stop = React.useCallback(() => {
    window.clearTimeout(timer.current)
    timer.current = undefined
    setHolding(false)
  }, [])

  React.useEffect(() => stop, [stop])

  const start = () => {
    if (timer.current !== undefined) return
    setHolding(true)
    timer.current = window.setTimeout(() => {
      stop()
      onHold()
    }, holdMs)
  }

  return (
    <Button
      data-slot="hold-button"
      {...props}
      className={cn("touch-none overflow-hidden", className)}
      onPointerDown={(event) => {
        if (event.button === 0) start()
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onBlur={stop}
      onKeyUp={stop}
      onKeyDown={(event) => {
        // Pointer-only would leave the action unreachable by keyboard.
        if (event.key !== " " && event.key !== "Enter") return
        event.preventDefault()
        if (!event.repeat) start()
      }}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 bg-[color-mix(in_oklab,currentColor_20%,transparent)] transition-[clip-path] duration-(--transition-duration-basic) ease-basic [clip-path:inset(0_100%_0_0)]",
          "data-holding:duration-(--hold-duration) data-holding:ease-linear data-holding:[clip-path:inset(0)]",
          // Reduced motion: the fill fades in over the hold instead of wiping across.
          "motion-reduce:opacity-0 motion-reduce:transition-opacity motion-reduce:[clip-path:none] motion-reduce:data-holding:opacity-100 motion-reduce:data-holding:[clip-path:none]"
        )}
        data-holding={holding || undefined}
        style={{ "--hold-duration": `${holdMs}ms` } as React.CSSProperties}
      />
      <span className="relative inline-flex items-center gap-1.5">{children}</span>
    </Button>
  )
}
