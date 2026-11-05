export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption }

import { type ComponentProps } from "react"

import { ScrollArea, ScrollBar } from "@ui/scroll-area"
import { cn } from "@lib/utils"

function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <ScrollArea
      data-slot="table-container"
      className="w-full min-w-0"
      viewportProps={{ className: "h-auto overflow-x-auto! overflow-y-hidden!" }}
      contentProps={{ className: "w-fit min-w-full! pb-2.5" }}
    >
      <table
        data-slot="table"
        className={cn("w-full border-collapse font-sans text-sm font-normal", className)}
        {...props}
      />
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function TableHeader(props: ComponentProps<"thead">) {
  return <thead data-slot="table-header" {...props} />
}

function TableBody(props: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" {...props} />
}

function TableFooter({ className, ...props }: ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "[&_td]:border-t [&_td]:border-b-0 [&_td]:border-subtle [&_td]:bg-surface-tertiary [&_td]:font-medium",
        className
      )}
      {...props}
    />
  )
}

/**
 * Body rows only take the row states. Selected beats hover and an open menu by leaving them out while selected; an
 * override like the empty row's `bg-transparent!` beats all three.
 */
function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "last:[&>td]:border-b-0",
        "in-[tbody]:transition-[background-color] in-[tbody]:duration-(--transition-duration-basic) in-[tbody]:ease-basic",
        "in-[tbody]:not-data-[state=selected]:hover:bg-surface-tertiary",
        "in-[tbody]:not-data-[state=selected]:has-[[aria-expanded=true]]:bg-surface-tertiary",
        "in-[tbody]:data-[state=selected]:bg-(--color-background-primary-soft-alpha)",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "border-y border-subtle px-gutter-lg py-2 text-left font-semibold whitespace-nowrap text-secondary has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "h-(--height-token-nav-row) border-b border-subtle px-gutter-lg py-2 whitespace-nowrap has-[[role=checkbox]]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("px-gutter-lg py-3 text-left font-medium text-secondary", className)}
      {...props}
    />
  )
}
