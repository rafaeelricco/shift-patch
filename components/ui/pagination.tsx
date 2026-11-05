export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
}

import { type ComponentProps } from "react"
import { ArrowLeft01Icon, ArrowRight01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { Button } from "@ui/button"
import { cn } from "@lib/utils"

function Pagination({ className, ...props }: ComponentProps<"nav">) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  )
}

function PaginationContent({ className, ...props }: ComponentProps<"ul">) {
  return <ul data-slot="pagination-content" className={cn("flex items-center gap-0.5", className)} {...props} />
}

function PaginationItem(props: ComponentProps<"li">) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = Omit<ComponentProps<typeof Button>, "variant"> & {
  isActive?: boolean
}

/** A real button, not an anchor: pages change through `onClick`, and an anchor with no `href` takes no focus. */
function PaginationLink({ isActive = false, size = "icon", ...props }: PaginationLinkProps) {
  return (
    <Button
      variant={isActive ? "outline-primary" : "ghost-primary"}
      size={size}
      aria-current={isActive ? "page" : undefined}
      data-active={isActive || undefined}
      {...props}
      data-slot="pagination-link"
    />
  )
}

function PaginationPrevious({ text = "Previous", ...props }: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink aria-label="Go to previous page" size="lg" {...props}>
      <HugeiconsIcon icon={ArrowLeft01Icon} />
      <span className="hidden sm:block">{text}</span>
    </PaginationLink>
  )
}

function PaginationNext({ text = "Next", ...props }: PaginationLinkProps & { text?: string }) {
  return (
    <PaginationLink aria-label="Go to next page" size="lg" {...props}>
      <span className="hidden sm:block">{text}</span>
      <HugeiconsIcon icon={ArrowRight01Icon} />
    </PaginationLink>
  )
}

function PaginationEllipsis({ className, ...props }: ComponentProps<"span">) {
  return (
    <span aria-hidden data-slot="pagination-ellipsis" className={cn("pagination-ellipsis", className)} {...props}>
      <HugeiconsIcon icon={MoreHorizontalIcon} />
      <span className="sr-only">More pages</span>
    </span>
  )
}
