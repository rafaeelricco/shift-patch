export { NotificationBanner, type Notice }

import { type ComponentProps } from "react"

import { cva } from "class-variance-authority"
import { cn } from "@lib/utils"
import { AlertCircleIcon, CheckCircleIcon } from "@ui/icons"

type Notice = { kind: "success"; message: string } | { kind: "error"; message: string }

// One element, told apart by its text and tone.
const bannerVariants = cva(
  "flex animate-banner-in items-start gap-2 rounded-xl px-gutter-md py-3 font-sans text-sm font-medium text-primary motion-reduce:animate-fade-in [&>svg]:size-5 [&>svg]:shrink-0",
  {
    variants: {
      tone: {
        success: "bg-success-surface inset-ring inset-ring-border-success-surface [&>svg]:text-icon-success",
        error: "bg-danger-surface inset-ring inset-ring-border-danger-surface [&>svg]:text-icon-error",
      },
    },
  }
)

function NotificationBanner({
  notice,
  className,
  ...rest
}: { notice: Notice } & Omit<ComponentProps<"div">, "children">) {
  switch (notice.kind) {
    case "success":
      return (
        <div role="status" className={cn(bannerVariants({ tone: "success" }), className)} {...rest}>
          <CheckCircleIcon />
          <span>{notice.message}</span>
        </div>
      )
    case "error":
      return (
        <div role="alert" className={cn(bannerVariants({ tone: "error" }), className)} {...rest}>
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
