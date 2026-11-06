# Tables (DataTable)

Every table follows one recipe: define `columns` as a **`ColumnsConfig`** (each a `ColumnDef` with a `label` and a `sortFun`, `null` for unsortable), pick a **`columnOrder`**, and map your typed data to **`rows`** of `{ key, value, contents }`, with `contents` keyed exactly to `columns`. `DataTable` renders the header, the sort affordance, and the empty state. It never reorders or pages rows itself: the host page owns sorting (`comparator`), slicing a page, and rendering `DataTablePagination` below the table.

Write that mutates the collection: `./forms.md`. Host page: `./pages.md`.

## Audit

- Read `components/ui/datatable.tsx` for the exported surface (`DataTable`, `ColumnDef`, `DataTablePagination`, `comparator`, `ColumnsConfig`, `SortState`).
- `app/page.tsx` uses `DataTable` for coverage, audit entries and timesheets; `tests/datatable.test.tsx` covers the primitive. The examples below also show pagination, selection, row actions and column toggles. Keep a new table's columns in its page file until a second page needs them.
- Check which test ID this table carries: `admin-dashboard-shift-table`, `audit-log-table` or `timesheet-table`.

Report the audit briefly:

```md
DataTable Audit:

- DataTable module path:
- Row type for this table:
- Sortable columns (sortFun) vs static (null):
- Default sort (SortState):
- Pagination or single page:
- Test ID on the table:
- Existing tables referenced:
```

## Canonical references (by role)

- **`@ui/datatable`**: `DataTable`, `ColumnDef`, `ColumnsConfig`, `SortState`, `comparator`, `DataTablePagination`. The whole public API.
- **`ColumnDef<T>`**: one column: `new ColumnDef({ label: ReactNode, sortFun: ((a: T, b: T) => number) | null, align?: "left" | "right", className?: string })`. `className` reaches the header cell only. `align` reaches both.
- **`ColumnsConfig<T>`**: `{ readonly [key: string]: ColumnDef<T> }`. Type the map with `satisfies ColumnsConfig<T>` so `contents` stays in sync.
- **`SortState`**: `{ sorting: "increasing" | "decreasing"; column: string } | { sorting: "unsorted"; column: null }`. `column` is a plain string, so pin a default with `satisfies ColumnId`.
- **`DataTableProps`**: `columns`, `columnOrder: readonly (keyof C)[]`, `rows`, `emptyMessage`, `sort`, `onSortChange`. All six required, and there is nothing else on the type (see Do / Do not).
- **`DataTablePagination`**: `page`, `pages`, `onPage`, optional `status`, and an all-or-nothing trio `sizes`, `size`, `onSize` (omit all three for no page-size menu).
- **`StatusBadge`** from `@ui/status-badge`: the status cell.
- **`paginate`**: not in the codebase today. `paginate(rows, page, size)` returns `{ rows, page (clamped), pages }`. Copy the version in §5 into the page that first needs it, and move it to `lib/` once a second module does.

## Imports

```ts
import { ColumnDef, DataTable, DataTablePagination, comparator } from "@ui/datatable"
import { type ColumnsConfig, type SortState } from "@ui/datatable"
import { StatusBadge } from "@ui/status-badge"
```

Paginating adds `paginate`, `PAGE_SIZES` and `PageSize`, defined in the page (§5).

## 1. Defining columns

Columns live in `lib/<name>-columns.ts` when shared, or in the page file when only that page uses them, with their `sortFun`s and the default sort, so the page (comparator) and the component (render) share one object:

```ts
const byAgency = (a: TimesheetRow, b: TimesheetRow): number => a.agencyName.localeCompare(b.agencyName)
const byDate = (a: TimesheetRow, b: TimesheetRow): number => a.date.localeCompare(b.date)

const TIMESHEET_COLUMNS = {
  nurse: new ColumnDef({ label: "Nurse", sortFun: null, className: "w-[28%]" }),
  agency: new ColumnDef({ label: "Agency", sortFun: byAgency, className: "w-[28%]" }),
  date: new ColumnDef({ label: "Date", sortFun: byDate, className: "w-32" }),
  times: new ColumnDef({ label: "Times", sortFun: null, className: "w-36" }),
} satisfies ColumnsConfig<TimesheetRow>

const TIMESHEET_ORDER = ["nurse", "agency", "date", "times"] as const

const DEFAULT_TIMESHEET_SORT: SortState = { sorting: "decreasing", column: "date" }
```

Every `sortFun` reads ascending: `comparator` negates it for `"decreasing"`, so writing one descending would flip on every other column. `className` sets widths on the header cell (`w-[28%]`, `w-32`, and so on). `sortFun: null` marks a column unsortable, for static, selection and action columns alike. ISO dates sort correctly as strings. Pin the default sort's `column` with `satisfies ColumnId` (a bare `SortState` literal compiles even if the string doesn't name a real column):

```ts
const DEFAULT_SORT: SortState = { sorting: "decreasing", column: "date" satisfies ColumnId }
```

## 2. Wiring rows

`contents` is keyed exactly to `columns`. `value` is the typed datum that `sortFun` and `onClick` receive:

```tsx
rows={rows.map((row) => ({
  key: row.id.value,
  value: row,
  contents: {
    nurse: row.nurseName ?? "—",
    agency: <span className="block whitespace-normal">{row.agencyName}</span>,
    date: <span className="tabular-nums text-secondary">{row.date}</span>,
    times: <span className="tabular-nums text-secondary">{row.startTime} to {row.endTime}</span>,
  },
}))}
```

Prose cells opt into wrapping on the cell content itself (`<span className="block whitespace-normal">…</span>`), because a column `className` only reaches the header. A row with `onClick` gets `tabIndex=0` and fires on click, Enter or Space. `selected: boolean` sets `aria-selected` and `data-state="selected"` for a selected row. A missing nurse is a dash, never a blank.

## 3. Column order

`columns` defines what a column _is_. `columnOrder` decides which render and in what order. Derive it from a constant order tuple filtered by the visible set, so toggling columns never reshuffles them:

```ts
const columnOrder = SHIFT_COLUMN_IDS.filter((id) => visible.includes(id))
```

Selection and action columns wrap the derived order rather than joining it:

```tsx
columnOrder={["select", ...visible, "actions"]}
```

## 4. Sorting

Sorting is controlled: `DataTable` never reorders rows itself. A header click cycles the column through new column → increasing → decreasing → unsorted, and emits the next `SortState` through `onSortChange`. The page applies it with `comparator(columns, sort)`, which falls back to store order for an unsorted, unknown or unsortable column:

```tsx
const [sort, setSort] = useState<SortState>(DEFAULT_TIMESHEET_SORT)
// `slice()` first: `sort()` mutates, and `ordered` must not mutate `rows`.
const ordered = useMemo(() => rows.slice().sort(comparator(TIMESHEET_COLUMNS, sort)), [rows, sort])
```

Sort before paginating (§5), so a page slice reflects the current order, not the one before the last sort.

## 5. Pagination and empty state

Pagination is outside `DataTable`. The page owns `page` and `pageSize` state, sorts, then paginates, then renders `DataTablePagination` below the table. `paginate` returns the clamped page, so the caller renders the page it actually got:

```ts
const PAGE_SIZES = [25, 50, 100] as const
type PageSize = (typeof PAGE_SIZES)[number]

function paginate<T>(
  rows: readonly T[],
  page: number,
  size: number
): { readonly rows: readonly T[]; readonly page: number; readonly pages: number } {
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const clamped = Math.min(Math.max(Math.trunc(page) || 1, 1), pages)
  const start = (clamped - 1) * size
  return { rows: rows.slice(start, start + size), page: clamped, pages }
}
```

```tsx
const [page, setPage] = useState(1)
const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0])
const current = paginate(ordered, page, pageSize)
```

```tsx
<DataTablePagination
  page={current.page}
  pages={current.pages}
  onPage={setPage}
  sizes={PAGE_SIZES}
  size={pageSize}
  onSize={onPageSize}
/>
```

Reset `page` to `1` whenever the filter, sort or page size changes: a stale page number otherwise strands the caller past the end of a shrunk set. Omit `DataTablePagination` entirely when the set is small enough to read on one page.

`emptyMessage` is a two-line node, not a single sentence:

```tsx
emptyMessage={
  <>
    <p className="type-text-sm text-primary">No shifts yet</p>
    <p className="mt-1 type-text-sm text-secondary">Posted shifts appear here.</p>
  </>
}
```

## 6. Test IDs, rich cells and row actions

A table's required test ID is a prop, and it reaches the `<table>` itself, including when the table is empty:

```tsx
<DataTable data-testid="timesheet-table" … />
```

`contents` values are `ReactNode`, so cells can be JSX: badges, icons, tabular-nums numerics. Status cells use `StatusBadge`, which takes an API status word and picks its intent, and forwards `data-testid`. Each admin row carries FR-5.2's test ID on the badge:

```tsx
<StatusBadge status={row.status} data-testid="admin-shift-status-badge" />
```

Because a row with `onClick` also fires on Enter and Space, a control inside a clickable row must stop both the click and the keydown, not just the click:

```tsx
function StopClick({ children }: { readonly children: ReactNode }) {
  return (
    <span
      className="flex items-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </span>
  )
}
```

Selection: a `select` column whose header is a select-all checkbox, `selected` on each row, and a per-row checkbox wrapped in `StopClick`:

```tsx
select: new ColumnDef({
  className: "w-10",
  sortFun: null,
  label: <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all visible rows" />,
}),
```

```tsx
contents: {
  select: (
    <StopClick>
      <Checkbox checked={selected} onCheckedChange={() => onToggle(row.id.value)} aria-label={`Select ${row.id.value}`} />
    </StopClick>
  ),
  // ...
}
```

Row actions: an `actions` column rendering a `DropdownMenu` whose trigger is an icon-only ghost button, wrapped in `StopClick`. `Button` is a native `<button>`, and the trigger's `render` prop puts Base UI's behavior on it. `shift-cancel-button` stays a visible `Button`, not a menu item, because FR-6.7 wants one click.

A URL that came from outside the app (user input, say) goes through an `http(s)`-only guard first, and a link opens only what it returns. No ShiftPatch row holds one today.

```ts
function httpHref(raw: string): string | null {
  try {
    const parsed = new URL(raw)
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? raw : null
  } catch {
    return null
  }
}
```

```tsx
actions: new ColumnDef({ label: "", sortFun: null, className: "w-10" }),
```

```tsx
<StopClick>
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost-primary" size="icon" />}>
      <span className="sr-only">Open menu</span>
      <HugeiconsIcon icon={MoreHorizontalIcon} />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-52">
      <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(row.id.value)}>
        <HugeiconsIcon icon={Copy01Icon} />
        Copy shift ID
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</StopClick>
```

Icons come from `import { HugeiconsIcon } from "@hugeicons/react"` plus a name from `@hugeicons/core-free-icons`, used as `<HugeiconsIcon icon={X} />`. Reuse a name the app already uses where one fits (`MoreHorizontalIcon`, `Tick02Icon`, `Calendar03Icon`, `Clock01Icon`). lucide is not installed.

## 7. Numeric columns and scheduled hours

Project convention: see `CONVENTIONS.md`, "Numeric Data in Tables", for the full rule, and `CLAUDE.md`.

- Format counts with **`toLocaleString()`** and nothing else: no `toFixed`, no `Intl.NumberFormat`, no template literal.
- Set **`align: "right"`** on the `ColumnDef` and pair it with **`tabular-nums`** on the cell.
- Digit-shaped **identifiers** (a shift id, an agency id) stay left-aligned. Right-align only what could sensibly be summed.
- `sortFun` reads the underlying number, never the formatted string.
- An absent figure renders as an em dash (`—`) or a phrase that says why it is missing, never `0`. "No value" is not a real zero.
- Drop unit suffixes the header already carries: a column titled "Scheduled hours" renders `12`, not `12 hours`.
- **Exempt:** composite or interactive cells (a status badge, a status dropdown) have no single right edge. Keep the figure `tabular-nums` and leave the column's default alignment.
- **Dates and times** render in the sans face with `tabular-nums`: `2026-10-03`, `07:00 to 19:00`. **Ids** are machine-readable, so they render in `font-mono` (`CLAUDE.md`).

The timesheet's figure is **scheduled hours**, because nobody clocks in (FR-9.1). Use the shared `scheduledDuration` described in `../time.md` when deriving that value; the API's timesheet response already supplies `hours`.

```tsx
hours: new ColumnDef({ label: "Scheduled hours", sortFun: byHours, align: "right" }),
// contents:
hours: <span className="tabular-nums">{row.hours.toLocaleString()}</span>,
```

## 8. Detail tables (carve-out)

`DataTable` is for a collection the user sorts, filters, selects or pages. A single record's label and value fields, or a short read-only list inside a sheet, uses the `@ui/table` primitives directly (`Table`, `TableBody`, `TableRow`, `TableCell`, plus `TableHeader` and `TableHead` when it has a header) instead. The numeric and `font-mono` rules from §7 and `CLAUDE.md` still apply there.

## Do / Do not

- Do: keep `contents` keys identical to `columns` and to `columnOrder`.
- Do: set `sortFun: null` for select, actions and static columns.
- Do: sort off the typed `value`, ascending, never off the rendered `contents` node.
- Do: own `page` and `pageSize` state in the page, sort with `comparator`, then `paginate`, then render `DataTablePagination` below the table.
- Do: reset `page` to `1` on filter, sort and page-size change.
- Do: stop both click and keydown (`StopClick`) on a control inside a clickable row.
- Do: right-align numeric quantities (`align: "right"` and `tabular-nums`) per §7.
- Do: pass the table's required test ID as `data-testid` on `DataTable`.
- Do not: pass `pagination`, `defaultSort` or `isTableFixed` to `DataTable`. None of these props exist.
- Do not: hand-roll a `<table>` for a sortable or pageable collection (a genuine detail table per §8 is fine).
- Do not: import the table pieces through `@/` or a relative path. `CLAUDE.md` requires the alias, `@ui/datatable`.
- Do not: format counts with anything but `toLocaleString()`.

## Examples

Three self-contained snippets use the joined admin shift with scheduled hours derived for display, as FR-5.1 and FR-9.1 show them.

```ts
import { type AdminShift } from "@api/endpoints"

type ShiftRow = AdminShift & { readonly hours: number }
```

### 1. Sorted table, one page

```tsx
import { useMemo, useState } from "react"
import { ColumnDef, DataTable, comparator } from "@ui/datatable"
import { type ColumnsConfig, type SortState } from "@ui/datatable"
import { StatusBadge } from "@ui/status-badge"

const byAgency = (a: ShiftRow, b: ShiftRow) => a.agencyName.localeCompare(b.agencyName)
const byDate = (a: ShiftRow, b: ShiftRow) => a.date.localeCompare(b.date)
const byHours = (a: ShiftRow, b: ShiftRow) => a.hours - b.hours

const SHIFT_COLUMNS = {
  agency: new ColumnDef({ label: "Agency", sortFun: byAgency }),
  date: new ColumnDef({ label: "Date", sortFun: byDate }),
  hours: new ColumnDef({ label: "Scheduled hours", sortFun: byHours, align: "right" }),
  status: new ColumnDef({ label: "Status", sortFun: null }),
} satisfies ColumnsConfig<ShiftRow>

const DEFAULT_SHIFT_SORT: SortState = {
  sorting: "decreasing",
  column: "date" satisfies keyof typeof SHIFT_COLUMNS,
}

function ShiftTable({ rows }: { readonly rows: readonly ShiftRow[] }) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SHIFT_SORT)
  const ordered = useMemo(() => rows.slice().sort(comparator(SHIFT_COLUMNS, sort)), [rows, sort])

  return (
    <DataTable
      data-testid="admin-dashboard-shift-table"
      columns={SHIFT_COLUMNS}
      columnOrder={["agency", "date", "hours", "status"]}
      sort={sort}
      onSortChange={setSort}
      emptyMessage={
        <>
          <p className="type-text-sm text-primary">No shifts yet</p>
          <p className="mt-1 type-text-sm text-secondary">Posted shifts appear here.</p>
        </>
      }
      rows={ordered.map((row) => ({
        key: row.id.value,
        value: row,
        contents: {
          agency: row.agencyName,
          date: <span className="text-secondary tabular-nums">{row.date}</span>,
          hours: <span className="tabular-nums">{row.hours.toLocaleString()}</span>,
          status: <StatusBadge status={row.status} data-testid="admin-shift-status-badge" />,
        },
      }))}
    />
  )
}
```

### 2. Paginated table with selection and row actions

Builds on `ShiftRow`, `SHIFT_COLUMNS` and `DEFAULT_SHIFT_SORT` from Example 1.

```tsx
import { useMemo, useState, type ReactNode } from "react"
import { Copy01Icon, MoreHorizontalIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { ColumnDef, DataTable, DataTablePagination, comparator } from "@ui/datatable"
import { type ColumnsConfig, type SortState } from "@ui/datatable"
import { Button } from "@ui/button"
import { Checkbox } from "@ui/checkbox"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@ui/dropdown-menu"
import { StatusBadge } from "@ui/status-badge"
// paginate, PAGE_SIZES, PageSize: §5.

function StopClick({ children }: { readonly children: ReactNode }) {
  return (
    <span
      className="flex items-center"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {children}
    </span>
  )
}

function RowActions({ row }: { readonly row: ShiftRow }) {
  return (
    <StopClick>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost-primary" size="icon" />}>
          <span className="sr-only">Open menu</span>
          <HugeiconsIcon icon={MoreHorizontalIcon} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={() => void navigator.clipboard.writeText(row.id.value)}>
            <HugeiconsIcon icon={Copy01Icon} />
            Copy shift ID
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </StopClick>
  )
}

function ShiftTableWithActions(props: {
  readonly rows: readonly ShiftRow[]
  readonly onOpen: (row: ShiftRow) => void
}) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SHIFT_SORT)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES[0])
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set())

  const ordered = useMemo(() => props.rows.slice().sort(comparator(SHIFT_COLUMNS, sort)), [props.rows, sort])
  const current = paginate(ordered, page, pageSize)
  const allSelected = current.rows.length > 0 && current.rows.every((row) => selected.has(row.id.value))

  const onSort = (next: SortState) => {
    setSort(next)
    setPage(1)
  }

  const onPageSize = (next: PageSize) => {
    setPageSize(next)
    setPage(1)
  }

  const onToggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const onToggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const row of current.rows) {
        if (allSelected) next.delete(row.id.value)
        else next.add(row.id.value)
      }
      return next
    })

  const columns = {
    select: new ColumnDef<ShiftRow>({
      className: "w-10",
      sortFun: null,
      label: <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all visible rows" />,
    }),
    ...SHIFT_COLUMNS,
    actions: new ColumnDef<ShiftRow>({ label: "", sortFun: null, className: "w-10" }),
  } satisfies ColumnsConfig<ShiftRow>

  return (
    <>
      <DataTable
        columns={columns}
        columnOrder={["select", "agency", "date", "hours", "status", "actions"]}
        sort={sort}
        onSortChange={onSort}
        emptyMessage="No shifts yet"
        rows={current.rows.map((row) => ({
          key: row.id.value,
          value: row,
          selected: selected.has(row.id.value),
          onClick: () => props.onOpen(row),
          contents: {
            select: (
              <StopClick>
                <Checkbox
                  checked={selected.has(row.id.value)}
                  onCheckedChange={() => onToggle(row.id.value)}
                  aria-label={`Select ${row.id.value}`}
                />
              </StopClick>
            ),
            agency: row.agencyName,
            date: <span className="text-secondary tabular-nums">{row.date}</span>,
            hours: <span className="tabular-nums">{row.hours.toLocaleString()}</span>,
            status: <StatusBadge status={row.status} />,
            actions: <RowActions row={row} />,
          },
        }))}
      />
      <DataTablePagination
        page={current.page}
        pages={current.pages}
        onPage={setPage}
        sizes={PAGE_SIZES}
        size={pageSize}
        onSize={onPageSize}
      />
    </>
  )
}
```

### 3. Conditional columns

Builds on `ShiftRow`, `SHIFT_COLUMNS` and `DEFAULT_SHIFT_SORT` from Example 1.

```tsx
import { useMemo, useState } from "react"
import { DataTable, comparator } from "@ui/datatable"
import { type SortState } from "@ui/datatable"
import { Button } from "@ui/button"
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@ui/dropdown-menu"
import { StatusBadge } from "@ui/status-badge"

const SHIFT_COLUMN_IDS = ["agency", "date", "hours", "status"] as const

type ShiftColumnId = (typeof SHIFT_COLUMN_IDS)[number]

function ConditionalShiftTable(props: { readonly rows: readonly ShiftRow[] }) {
  const [sort, setSort] = useState<SortState>(DEFAULT_SHIFT_SORT)
  const [visible, setVisible] = useState<readonly ShiftColumnId[]>(SHIFT_COLUMN_IDS)

  const ordered = useMemo(() => props.rows.slice().sort(comparator(SHIFT_COLUMNS, sort)), [props.rows, sort])
  const columnOrder = SHIFT_COLUMN_IDS.filter((id) => visible.includes(id))

  const onToggleColumn = (id: ShiftColumnId) =>
    setVisible((prev) => (prev.includes(id) ? prev.filter((one) => one !== id) : [...prev, id]))

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline-primary" size="sm" />}>Columns</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {SHIFT_COLUMN_IDS.map((id) => (
            <DropdownMenuCheckboxItem
              key={id}
              checked={visible.includes(id)}
              onCheckedChange={() => onToggleColumn(id)}
            >
              {SHIFT_COLUMNS[id].values.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <DataTable
        columns={SHIFT_COLUMNS}
        columnOrder={columnOrder}
        sort={sort}
        onSortChange={setSort}
        emptyMessage="No shifts yet"
        rows={ordered.map((row) => ({
          key: row.id.value,
          value: row,
          contents: {
            agency: row.agencyName,
            date: <span className="text-secondary tabular-nums">{row.date}</span>,
            hours: <span className="tabular-nums">{row.hours.toLocaleString()}</span>,
            status: <StatusBadge status={row.status} />,
          },
        }))}
      />
    </>
  )
}
```
