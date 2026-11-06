export { Button, buttonVariants }

import { type ComponentProps } from "react"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@lib/utils"

// The fill is a ::before layer so a press can shrink it by 1px.
const buttonVariants = cva(
  [
    "group/button relative isolate inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full text-sm leading-none font-medium whitespace-nowrap [--inset:1px] [--outer-radius:var(--radius-full)]",
    "transition-[color,box-shadow] duration-(--transition-duration-basic) ease-basic",
    "before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:transition-[background-color,clip-path] before:duration-(--transition-duration-basic) before:ease-enter-snappy before:[clip-path:inset(0_round_var(--outer-radius))]",
    "active:before:duration-80 active:before:[clip-path:inset(var(--inset)_round_calc(var(--outer-radius)-var(--inset)))] motion-reduce:before:transition-[background-color]",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
    "disabled:pointer-events-none disabled:opacity-40 aria-busy:pointer-events-none",
  ],
  {
    variants: {
      variant: {
        "solid-primary":
          "text-on-primary-solid before:bg-primary-solid hover:before:bg-primary-solid-hover active:before:bg-primary-solid-active",
        "outline-primary":
          "text-primary-outline inset-ring inset-ring-border-primary-outline hover:inset-ring-border-primary-outline-hover hover:before:bg-primary-outline-hover active:before:bg-primary-outline-active",
        "ghost-primary":
          "text-primary-ghost hover:before:bg-ghost-hover focus-visible:-outline-offset-1 active:before:bg-ghost-active",
        "solid-danger":
          "text-on-danger-solid before:bg-danger-solid hover:before:bg-danger-solid-hover focus-visible:outline-ring-danger active:before:bg-danger-solid-active",
        "outline-danger":
          "text-danger-outline inset-ring inset-ring-border-danger-outline hover:inset-ring-border-danger-outline-hover hover:before:bg-danger-outline-hover focus-visible:outline-ring-danger active:before:bg-danger-outline-active",
      },
      size: {
        sm: "h-control-sm px-gutter-md",
        lg: "h-control-lg px-gutter-lg",
        xl: "h-control-xl px-gutter-xl",
        // An icon-only button: a circle on the button's own height, pressed by scale instead of the fill shrink.
        icon: "size-control-lg p-0 text-[length:var(--control-icon-size-lg)] transition-[color,box-shadow,transform] active:scale-97 active:before:[clip-path:inset(0_round_var(--outer-radius))] motion-reduce:active:scale-100",
        // The same at the small height, for a button that sits beside a `sm` button (a row's menu chevron).
        "icon-sm":
          "size-control-sm p-0 text-[length:var(--control-icon-size-sm)] transition-[color,box-shadow,transform] active:scale-97 active:before:[clip-path:inset(0_round_var(--outer-radius))] motion-reduce:active:scale-100",
      },
    },
    defaultVariants: { variant: "solid-primary", size: "lg" },
  }
)

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { loading?: boolean }

function Button({
  variant,
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
      data-size={size ?? undefined}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...rest}
      disabled={loading || disabled}
    >
      <span className="inline-flex items-center gap-1.5 group-aria-busy/button:invisible [&>svg]:pointer-events-none [&>svg]:size-icon-sm [&>svg]:shrink-0 group-data-[size=icon]/button:[&>svg]:size-icon-lg">
        {children}
      </span>
      {loading && (
        <span
          className="absolute size-4 animate-spinner rounded-full border-2 border-current border-r-transparent motion-reduce:animate-pulse-opacity"
          aria-hidden="true"
        />
      )}
    </button>
  )
}
