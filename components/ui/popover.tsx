"use client"

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
  popupMotion,
  popupSurface,
}

import * as React from "react"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "@lib/utils"

/** Floating panels fade with a small scale from their anchor; shared by the select, menu, popover and tooltip popups. */
const popupMotion = cn(
  "origin-(--transform-origin) outline-none",
  "transition-[opacity,scale] duration-(--transition-duration-basic) ease-[var(--ease-basic),var(--cubic-enter)]",
  "data-ending-style:scale-97 data-ending-style:opacity-0 data-starting-style:scale-97 data-starting-style:opacity-0",
  "motion-reduce:data-ending-style:scale-100 motion-reduce:data-starting-style:scale-100"
)

/** The flat floating panel with a hairline frame; shared by the select, menu and popover popups. */
const popupSurface = cn(
  "rounded-2xl bg-elevated font-sans text-sm font-normal text-primary shadow-hairline",
  popupMotion
)

function Popover({ ...props }: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger({ ...props }: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverContent({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(popupSurface, "z-50 flex w-72 flex-col gap-2.5 p-2.5", className)}
          {...props}
        />
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  )
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn("flex flex-col gap-0.5", className)} {...props} />
}

function PopoverTitle({ className, ...props }: PopoverPrimitive.Title.Props) {
  return <PopoverPrimitive.Title data-slot="popover-title" className={cn("font-medium", className)} {...props} />
}

function PopoverDescription({ className, ...props }: PopoverPrimitive.Description.Props) {
  return (
    <PopoverPrimitive.Description
      data-slot="popover-description"
      className={cn("text-secondary", className)}
      {...props}
    />
  )
}
