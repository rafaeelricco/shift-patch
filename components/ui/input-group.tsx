"use client"

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea }

import * as React from "react"

import { cn } from "@lib/utils"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Textarea } from "@ui/textarea"

function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="input-group" role="group" className={cn("input-group", className)} {...props} />
}

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & {
  align?: "inline-start" | "inline-end" | "block-start" | "block-end"
}) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align}
      className={cn("input-group-addon", className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) {
          return
        }
        e.currentTarget.parentElement?.querySelector("input")?.focus()
      }}
      {...props}
    />
  )
}

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost-primary",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> & {
  size?: "xs" | "sm" | "icon-xs" | "icon-sm"
  type?: "button" | "submit" | "reset"
}) {
  return (
    <Button type={type} data-size={size} variant={variant} className={cn("input-group-button", className)} {...props} />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("input-group-text", className)} {...props} />
}

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return <Input data-slot="input-group-control" className={cn("input-group-control", className)} {...props} />
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <Textarea data-slot="input-group-control" className={cn("input-group-control resize-none", className)} {...props} />
  )
}
