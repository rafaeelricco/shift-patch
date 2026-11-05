"use client"

export { Checkbox }

import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root data-slot="checkbox" className={cn("peer checkbox", className)} {...props}>
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="checkbox-indicator">
        <HugeiconsIcon icon={Tick02Icon} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
