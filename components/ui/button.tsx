export { Button, buttonVariants }

import { type ComponentProps } from "react"

import { cn } from "@lib/utils"

type ButtonVariant = "solid-primary" | "outline-primary" | "ghost-primary" | "solid-danger" | "outline-danger"

const SIZE_CLASS = { sm: "btn-sm", lg: undefined, xl: "btn-xl", icon: "btn-icon" } as const
type ButtonSize = keyof typeof SIZE_CLASS

type ButtonVariantProps = {
  variant?: ButtonVariant
  size?: ButtonSize
}

type ButtonProps = ComponentProps<"button"> &
  ButtonVariantProps & {
    loading?: boolean
  }

const buttonVariants = ({ variant = "solid-primary", size = "lg" }: ButtonVariantProps = {}): string =>
  cn("btn", `btn-${variant}`, SIZE_CLASS[size])

function Button({
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
      data-slot="button"
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
      disabled={loading || disabled}
    >
      <span className="btn-label">{children}</span>
      {loading && <span className="btn-spinner" aria-hidden="true" />}
    </button>
  )
}
