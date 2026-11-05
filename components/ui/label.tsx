export { Label, fieldLabel }

import * as React from "react"

import { cn } from "@lib/utils"

/** A field's label text; shared by Label and FileField's frame. */
const fieldLabel = "text-sm font-medium text-primary"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        fieldLabel,
        "flex items-center gap-2 select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}
