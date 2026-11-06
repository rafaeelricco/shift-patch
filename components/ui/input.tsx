"use client"

export { Input, fieldControl }

import * as React from "react"

import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@lib/utils"

/** The bordered control surface; shared by Textarea, SelectTrigger, FileField and the forms triggers. */
const fieldControl = cn(
  "h-control-lg w-full min-w-0 appearance-none rounded-lg bg-control px-gutter-md text-sm text-primary [--outer-radius:var(--radius-lg)]",
  "inset-ring inset-ring-strong transition-[background-color,box-shadow] duration-(--transition-duration-basic) ease-basic",
  "placeholder:text-sm placeholder:text-tertiary",
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
  "aria-invalid:focus-visible:inset-ring-border-danger-outline-hover aria-invalid:focus-visible:outline-ring-danger",
  "disabled:cursor-not-allowed disabled:bg-transparent disabled:text-disabled disabled:inset-ring-border-disabled",
  "hover:not-disabled:not-focus-visible:bg-[linear-gradient(var(--alpha-02),var(--alpha-02))] hover:not-disabled:not-focus-visible:inset-ring-border-primary-outline-hover",
  "aria-invalid:hover:not-disabled:not-focus-visible:bg-danger-surface aria-invalid:hover:not-disabled:not-focus-visible:bg-none aria-invalid:hover:not-disabled:not-focus-visible:inset-ring-border-danger-outline-hover"
)

function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <InputPrimitive data-slot="input" className={cn(fieldControl, className)} {...props} />
}
