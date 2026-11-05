"use client"

export { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea }

import * as React from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@lib/utils"
import { Button } from "@ui/button"
import { Input } from "@ui/input"
import { Textarea } from "@ui/textarea"

/** One field frame around a borderless control and its addons; the frame draws every state. */
function InputGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      role="group"
      className={cn(
        "group/input-group relative flex h-control-lg w-full min-w-0 items-center rounded-lg bg-control inset-ring inset-ring-strong transition-[background-color,box-shadow] duration-(--transition-duration-basic) ease-basic [--outer-radius:var(--radius-lg)]",
        "has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto",
        "has-[>[data-align=inline-end]]:[&>input]:pr-gutter-2xs has-[>[data-align=inline-start]]:[&>input]:pl-gutter-2xs",
        "has-[[data-slot=input-group-control]:focus-visible]:outline-2 has-[[data-slot=input-group-control]:focus-visible]:outline-offset-1 has-[[data-slot=input-group-control]:focus-visible]:outline-ring",
        "has-[[data-slot][aria-invalid=true]]:inset-ring-border-danger-outline-hover has-[[data-slot][aria-invalid=true]:focus-visible]:outline-ring-danger",
        "has-disabled:bg-transparent has-disabled:inset-ring-border-disabled",
        "hover:not-has-disabled:not-has-aria-invalid:not-has-focus-visible:inset-shadow-[0_0_0_99px_var(--color-hover-tint)] hover:not-has-disabled:not-has-aria-invalid:not-has-focus-visible:inset-ring-border-primary-outline-hover",
        className
      )}
      {...props}
    />
  )
}

const inputGroupAddonVariants = cva(
  "flex cursor-text items-center justify-center gap-input-md py-gutter-2xs text-sm font-medium text-secondary select-none group-has-disabled/input-group:text-disabled group-data-[disabled=true]/input-group:text-disabled [&>svg]:size-icon-sm",
  {
    variants: {
      align: {
        "inline-start": "-order-1 pl-gutter-xs has-[>button]:-ml-input-xs",
        "inline-end": "order-1 pr-gutter-xs has-[>button]:-mr-input-xs",
        "block-start": "-order-1 w-full justify-start px-gutter-sm pt-gutter-xs pb-0",
        "block-end": "order-1 w-full justify-start px-gutter-sm pt-0 pb-gutter-xs",
      },
    },
    defaultVariants: { align: "inline-start" },
  }
)

function InputGroupAddon({
  className,
  align = "inline-start",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align ?? undefined}
      className={cn(inputGroupAddonVariants({ align }), className)}
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

const inputGroupButtonVariants = cva("", {
  variants: {
    size: {
      xs: "h-control-2xs px-gutter-2xs",
      sm: "h-control-sm px-gutter-sm",
      "icon-xs": "size-control-2xs p-0",
      "icon-sm": "size-control-md p-0",
    },
  },
  defaultVariants: { size: "xs" },
})

function InputGroupButton({
  className,
  type = "button",
  variant = "ghost-primary",
  size = "xs",
  ...props
}: Omit<React.ComponentProps<typeof Button>, "size" | "type"> &
  VariantProps<typeof inputGroupButtonVariants> & {
    type?: "button" | "submit" | "reset"
  }) {
  return (
    <Button
      type={type}
      data-size={size ?? undefined}
      variant={variant}
      className={cn(inputGroupButtonVariants({ size }), className)}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "flex items-center gap-input-md text-sm font-normal text-secondary [&_svg]:pointer-events-none [&_svg]:size-icon-sm",
        className
      )}
      {...props}
    />
  )
}

/** Clears the field-control surface: the group frame draws background, ring, outline and hover. */
const CONTROL_RESET =
  "flex-1 bg-transparent inset-ring-0 inset-shadow-none outline-none focus-visible:outline-none disabled:bg-transparent disabled:inset-ring-0 hover:not-disabled:not-focus-visible:inset-ring-0 hover:not-disabled:not-focus-visible:inset-shadow-none aria-invalid:hover:not-disabled:not-focus-visible:bg-transparent aria-invalid:hover:not-disabled:not-focus-visible:inset-shadow-none aria-invalid:focus-visible:inset-ring-0"

function InputGroupInput({ className, ...props }: React.ComponentProps<"input">) {
  return <Input data-slot="input-group-control" className={cn(CONTROL_RESET, className)} {...props} />
}

function InputGroupTextarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <Textarea data-slot="input-group-control" className={cn(CONTROL_RESET, "resize-none", className)} {...props} />
}
