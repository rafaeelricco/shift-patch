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
      <table data-slot="table" className={cn("data-table", className)} {...props} />
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

function TableFooter(props: ComponentProps<"tfoot">) {
  return <tfoot data-slot="table-footer" {...props} />
}

function TableRow(props: ComponentProps<"tr">) {
  return <tr data-slot="table-row" {...props} />
}

function TableHead(props: ComponentProps<"th">) {
  return <th data-slot="table-head" {...props} />
}

function TableCell(props: ComponentProps<"td">) {
  return <td data-slot="table-cell" {...props} />
}

function TableCaption(props: ComponentProps<"caption">) {
  return <caption data-slot="table-caption" {...props} />
}
