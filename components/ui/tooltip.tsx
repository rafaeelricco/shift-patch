"use client"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "@lib/utils"
import { popupMotion } from "@ui/popover"

function TooltipProvider({ delay = 0, ...props }: TooltipPrimitive.Provider.Props) {
  return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delay} {...props} />
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            popupMotion,
            "z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-(--tooltip-border-radius) bg-(--tooltip-compact-background-color) p-(--tooltip-compact-padding) font-sans text-(length:--tooltip-compact-font-size) leading-4 font-(--tooltip-compact-font-weight) text-(--tooltip-compact-text-color) data-instant:transition-none",
            className
          )}
          {...props}
        >
          {children}
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}
