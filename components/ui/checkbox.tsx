"use client"

export { Checkbox }

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative inline-flex size-icon-sm shrink-0 cursor-pointer items-center justify-center rounded-sm bg-control text-on-primary-solid inset-ring inset-ring-strong",
        "transition-[background-color,box-shadow] duration-(--transition-duration-basic) ease-basic",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "data-checked:bg-primary-solid data-checked:not-aria-invalid:inset-ring-0 data-indeterminate:bg-primary-solid data-indeterminate:not-aria-invalid:inset-ring-0",
        "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        "aria-invalid:inset-ring-border-danger-outline-hover aria-invalid:focus-visible:outline-ring-danger",
        "data-disabled:cursor-not-allowed data-disabled:opacity-40",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center [&>svg]:size-icon-xs"
      >
        <HugeiconsIcon icon={Tick02Icon} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
