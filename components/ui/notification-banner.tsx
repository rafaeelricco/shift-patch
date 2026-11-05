import { type ComponentProps } from "react"

import { cn } from "@lib/utils"
import { AlertCircleIcon, CheckCircleIcon } from "@/components/ui/icons"

export type Notice = { kind: "success"; message: string } | { kind: "error"; message: string }

export function NotificationBanner({
  notice,
  className,
  ...rest
}: { notice: Notice } & Omit<ComponentProps<"div">, "children">) {
  switch (notice.kind) {
    case "success":
      return (
        <div role="status" className={cn("banner banner-success", className)} {...rest}>
          <CheckCircleIcon />
          <span>{notice.message}</span>
        </div>
      )
    case "error":
      return (
        <div role="alert" className={cn("banner banner-error", className)} {...rest}>
          <AlertCircleIcon />
          <span>{notice.message}</span>
        </div>
      )
    default: {
      const _exhaustiveCheck: never = notice
      throw new Error(`Unknown notice: ${JSON.stringify(_exhaustiveCheck)}`)
    }
  }
}
