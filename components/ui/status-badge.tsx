import { type ComponentProps } from "react"

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

export type Status = keyof typeof STATUS_INTENT

export function StatusBadge({ status, className, ...rest }: { status: Status } & ComponentProps<"span">) {
  return (
    <span className={cn("badge", `badge-${STATUS_INTENT[status]}`, className)} {...rest}>
      <span className="badge-label">{status}</span>
    </span>
  )
}
