export { StatusBadge, type Status }

import { type ComponentProps } from "react"

import { cva } from "class-variance-authority"
import { cn } from "@lib/utils"

const STATUS_INTENT = {
  open: "info",
  filled: "success",
  valid: "success",
  expired: "danger",
  pending: "warning",
  approved: "success",
  rejected: "danger",
} as const satisfies Record<string, "info" | "success" | "warning" | "danger">

type Status = keyof typeof STATUS_INTENT

/*
 * A soft tint, and the stronger surface text so 12px labels stay readable.
 * Concentric with a tight parent that declares --outer-radius and --inset. Past the
 * formula's limit no parent declares them, so it takes the app's pill shape.
 */
const badgeVariants = cva(
  "inline-flex h-(--badge-size-sm) items-center rounded-[max(var(--badge-radius-sm),calc(var(--outer-radius,var(--radius-full))_-_var(--inset,0px)))] px-(--badge-gutter-lg) font-sans text-(length:--badge-font-size-sm) leading-none font-(--badge-font-weight-sm) tracking-(--badge-tracking-sm) whitespace-nowrap",
  {
    variants: {
      intent: {
        info: "bg-info-soft text-on-info-soft",
        success: "bg-success-soft text-on-success-soft",
        warning: "bg-warning-soft text-on-warning-soft",
        danger: "bg-danger-soft text-on-danger-soft",
      },
    },
  }
)

function StatusBadge({ status, className, ...rest }: { status: Status } & Omit<ComponentProps<"span">, "children">) {
  return (
    <span className={cn(badgeVariants({ intent: STATUS_INTENT[status] }), className)} {...rest}>
      <span className="supports-[text-box:trim-both_cap_alphabetic]:[text-box:trim-both_cap_alphabetic]">{status}</span>
    </span>
  )
}
