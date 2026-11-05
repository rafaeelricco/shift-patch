"use client"

export { Input }

import * as React from "react"

import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@lib/utils"

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <InputPrimitive data-slot="input" className={cn("field-control", className)} {...props} />
}
