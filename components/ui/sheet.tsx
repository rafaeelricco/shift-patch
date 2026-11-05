"use client"

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription }

import * as React from "react"

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { Cancel01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@lib/utils"
import { Button } from "@ui/button"
import { backdrop } from "@ui/dialog"

/** Each side slides in from 2.5rem off its edge (--sheet-from). */
const sheetVariants = cva(
  cn(
    "fixed z-50 flex flex-col gap-4 bg-elevated font-sans text-sm font-normal text-primary outline-none",
    "transition-[opacity,translate] duration-(--transition-duration-relaxed) ease-enter",
    "data-ending-style:[translate:var(--sheet-from)] data-ending-style:opacity-0 data-starting-style:[translate:var(--sheet-from)] data-starting-style:opacity-0",
    "data-ending-style:duration-(--transition-duration-basic) data-ending-style:ease-basic",
    "motion-reduce:data-ending-style:[translate:none] motion-reduce:data-starting-style:[translate:none]"
  ),
  {
    variants: {
      side: {
        right: "inset-y-0 right-0 w-3/4 max-w-96 rounded-l-(--modal-radius) [--sheet-from:calc(var(--spacing)*10)_0]",
        left: "inset-y-0 left-0 w-3/4 max-w-96 rounded-r-(--modal-radius) [--sheet-from:calc(var(--spacing)*-10)_0]",
        top: "inset-x-0 top-0 rounded-b-(--modal-radius) [--sheet-from:0_calc(var(--spacing)*-10)]",
        bottom: "inset-x-0 bottom-0 rounded-t-(--modal-radius) [--sheet-from:0_calc(var(--spacing)*10)]",
      },
    },
    defaultVariants: { side: "right" },
  }
)

function Sheet({ ...props }: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: SheetPrimitive.Portal.Props) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({ className, ...props }: SheetPrimitive.Backdrop.Props) {
  return <SheetPrimitive.Backdrop data-slot="sheet-overlay" className={cn(backdrop, className)} {...props} />
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props &
  VariantProps<typeof sheetVariants> & {
    showCloseButton?: boolean
  }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost-primary" className="absolute top-3 right-3" size="icon" />}
          >
            <HugeiconsIcon icon={Cancel01Icon} />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-0.5 p-4", className)} {...props} />
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-footer" className={cn("mt-auto flex flex-col gap-2 p-4", className)} {...props} />
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("type-heading-sm", className)} {...props} />
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("type-text-sm text-secondary", className)}
      {...props}
    />
  )
}
