import { afterEach, describe, expect, it, vi } from "vitest"
import { useState } from "react"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"

import { ColumnDef, DataTable, comparator, type SortState } from "@ui/datatable"

afterEach(cleanup)

// jsdom lacks this, and Base UI's scroll area measures its viewport with it.
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub)

type Shift = { id: string; facility: string; hours: number }

const SHIFTS: readonly Shift[] = [
  { id: "s1", facility: "Birch", hours: 8 },
  { id: "s2", facility: "Aspen", hours: 12 },
  { id: "s3", facility: "Cedar", hours: 1200 },
]

const columns = {
  facility: new ColumnDef<Shift>({ label: "Facility", sortFun: (a, b) => a.facility.localeCompare(b.facility) }),
  hours: new ColumnDef<Shift>({ label: "Hours", sortFun: (a, b) => a.hours - b.hours, align: "right" }),
  actions: new ColumnDef<Shift>({ label: "Actions", sortFun: null }),
}

function ShiftsTable({ shifts }: { shifts: readonly Shift[] }) {
  const [sort, setSort] = useState<SortState>({ sorting: "unsorted", column: null })
  const rows = [...shifts].sort(comparator(columns, sort)).map((shift) => ({
    key: shift.id,
    value: shift,
    contents: { facility: shift.facility, hours: shift.hours.toLocaleString(), actions: "Open" },
  }))
  return (
    <DataTable
      columns={columns}
      columnOrder={["facility", "hours", "actions"]}
      rows={rows}
      emptyMessage="No shifts yet."
      sort={sort}
      onSortChange={setSort}
    />
  )
}

const facilityOrder = (): (string | null)[] =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => row.querySelector("td")?.textContent ?? null)

describe("DataTable", () => {
  it.each([false, true])("preserves cell controls' keyboard defaults when row action is %s", (actionable) => {
    const onOpen = vi.fn()
    const shift = SHIFTS[0]!
    render(
      <DataTable
        columns={columns}
        columnOrder={["facility", "hours", "actions"]}
        rows={[
          {
            key: shift.id,
            value: shift,
            contents: {
              facility: <input aria-label="Facility" defaultValue={shift.facility} />,
              hours: shift.hours,
              actions: <button type="button">Open shift</button>,
            },
            ...(actionable ? { onClick: onOpen } : {}),
          },
        ]}
        emptyMessage="No shifts yet."
        sort={{ sorting: "unsorted", column: null }}
        onSortChange={() => {}}
      />
    )

    for (const control of [screen.getByRole("textbox"), screen.getByRole("button", { name: "Open shift" })]) {
      for (const key of ["Enter", " "]) {
        const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
        fireEvent(control, event)
        expect(event.defaultPrevented).toBe(false)
      }
    }
    expect(onOpen).not.toHaveBeenCalled()
  })

  it.each(["Enter", " "])("activates the focused row with %j", (key) => {
    const onOpen = vi.fn()
    const shift = SHIFTS[0]!
    render(
      <DataTable
        columns={columns}
        columnOrder={["facility"]}
        rows={[
          {
            key: shift.id,
            value: shift,
            contents: { facility: shift.facility, hours: shift.hours, actions: "Open" },
            onClick: onOpen,
          },
        ]}
        emptyMessage="No shifts yet."
        sort={{ sorting: "unsorted", column: null }}
        onSortChange={() => {}}
      />
    )
    const row = screen.getByRole("row", { name: shift.facility })
    row.focus()
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true })
    fireEvent(row, event)
    expect(event.defaultPrevented).toBe(true)
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(shift)
  })

  it("puts its test ID on the table, including when it is empty", () => {
    const empty = { sorting: "unsorted", column: null } as const
    const { rerender } = render(
      <DataTable<Shift, typeof columns>
        data-testid="timesheet-table"
        columns={columns}
        columnOrder={["facility"]}
        rows={[]}
        emptyMessage="No shifts yet."
        sort={empty}
        onSortChange={() => {}}
      />
    )
    expect(screen.getByTestId("timesheet-table").tagName).toBe("TABLE")

    rerender(
      <DataTable<Shift, typeof columns>
        columns={columns}
        columnOrder={["facility"]}
        rows={[]}
        emptyMessage="No shifts yet."
        sort={empty}
        onSortChange={() => {}}
      />
    )
    expect(screen.queryByTestId("timesheet-table")).toBeNull()
  })

  it("cycles a column's sort through none, increasing, decreasing and back", () => {
    render(<ShiftsTable shifts={SHIFTS} />)
    const header = screen.getByRole("columnheader", { name: /Facility/ })
    const toggle = within(header).getByRole("button", { name: "Toggle sort" })

    expect(header.getAttribute("aria-sort")).toBe("none")
    expect(facilityOrder()).toEqual(["Birch", "Aspen", "Cedar"])

    fireEvent.click(toggle)
    expect(header.getAttribute("aria-sort")).toBe("ascending")
    expect(facilityOrder()).toEqual(["Aspen", "Birch", "Cedar"])

    fireEvent.click(toggle)
    expect(header.getAttribute("aria-sort")).toBe("descending")
    expect(facilityOrder()).toEqual(["Cedar", "Birch", "Aspen"])

    fireEvent.click(toggle)
    expect(header.getAttribute("aria-sort")).toBe("none")
    expect(facilityOrder()).toEqual(["Birch", "Aspen", "Cedar"])
  })

  it("gives an unsortable column no sort control", () => {
    render(<ShiftsTable shifts={SHIFTS} />)
    const header = screen.getByRole("columnheader", { name: "Actions" })
    expect(header.hasAttribute("aria-sort")).toBe(false)
    expect(within(header).queryByRole("button")).toBeNull()
  })

  it("shows the empty message across every column when there are no rows", () => {
    render(<ShiftsTable shifts={[]} />)
    const cell = screen.getByRole("cell", { name: "No shifts yet." })
    expect(cell.getAttribute("colspan")).toBe("3")
  })

  it("right-aligns a numeric column's header and cells", () => {
    render(<ShiftsTable shifts={SHIFTS} />)
    expect(screen.getByRole("columnheader", { name: /Hours/ }).classList.contains("is-numeric")).toBe(true)
    expect(screen.getByRole("cell", { name: (1200).toLocaleString() }).classList.contains("is-numeric")).toBe(true)
    expect(screen.getByRole("cell", { name: "Birch" }).classList.contains("is-numeric")).toBe(false)
  })
})
