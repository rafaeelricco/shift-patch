import { type ComponentProps } from "react"

import { cn } from "@lib/utils"

type ButtonVariant = "solid-primary" | "outline-primary" | "ghost-primary" | "solid-danger" | "outline-danger"

const SIZE_CLASS = { sm: "btn-sm", lg: undefined, xl: "btn-xl" } as const
type ButtonSize = keyof typeof SIZE_CLASS

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

export function Button({
  variant = "solid-primary",
  size = "lg",
  loading = false,
  disabled,
  type = "button",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      className={cn("btn", `btn-${variant}`, SIZE_CLASS[size], className)}
      {...rest}
      disabled={loading || disabled}
    >
      <span className="btn-label">{children}</span>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
    </button>
  )
}
