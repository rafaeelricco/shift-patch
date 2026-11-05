export { Textarea }

import * as React from "react"

import { cn } from "@lib/utils"
import { fieldControl } from "@ui/input"

/** A field control that grows with its text. */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(fieldControl, "field-sizing-content h-auto min-h-16 py-gutter-xs", className)}
      {...props}
    />
  )
}
