export { ShiftCard, type ShiftSummary }

import { type ComponentProps, type ReactNode } from "react"

import { cn } from "@lib/utils"
import { StatusBadge } from "@ui/status-badge"
import { surfaceCard } from "@ui/surface-card"

type ShiftSummary = {
  role: "RN" | "LPN"
  agencyName: string
  date: string
  startTime: string
  endTime: string
  status: "open" | "filled"
}

type ShiftCardProps = { shift: ShiftSummary; detail?: string; action?: ReactNode } & Omit<
  ComponentProps<"article">,
  "children"
>

/** `data-testid` (`shift-list-item`), `tabIndex` and aria props reach the `<article>` through `rest`. */
function ShiftCard({ shift, detail, action, className, ...rest }: ShiftCardProps) {
  return (
    <article
      className={cn(surfaceCard, "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 p-4", className)}
      {...rest}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="type-heading-xs">{shift.role} shift</h3>
          <StatusBadge status={shift.status} />
        </div>
        <p className="type-text-sm text-secondary">{shift.agencyName}</p>
        <p className="type-text-sm text-secondary tabular-nums">
          {shift.date}, {shift.startTime} to {shift.endTime}
        </p>
        {detail && <p className="type-text-sm text-secondary">{detail}</p>}
      </div>
      {action && <div className="flex flex-wrap items-end gap-2">{action}</div>}
    </article>
  )
}
