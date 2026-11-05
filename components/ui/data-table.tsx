import { type ComponentProps, type ReactNode } from "react"

import { cn } from "@lib/utils"

export type Column<Row> = {
  key: string
  label: string
  align?: "left" | "right"
  cell: (row: Row) => ReactNode
}

type DataTableProps<Row> = {
  caption: string
  columns: ReadonlyArray<Column<Row>>
  rows: ReadonlyArray<Row>
  rowKey: (row: Row) => string
} & Omit<ComponentProps<"table">, "children">

export function DataTable<Row>({ caption, columns, rows, rowKey, className, ...rest }: DataTableProps<Row>) {
  return (
    <div className="data-table-frame">
      <table className={cn("data-table", className)} {...rest}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.align === "right" ? "is-numeric" : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className={column.align === "right" ? "is-numeric" : undefined}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
