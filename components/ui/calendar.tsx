"use client"

export { Calendar, CalendarDayButton }

import { cva, type VariantProps } from "class-variance-authority"

import * as React from "react"

import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker"
import { ArrowDown01Icon, ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@lib/utils"
import { Button, buttonVariants } from "@ui/button"

// Nav and day buttons size from the root's --cell-size; h/w sort after the icon size's `size-*`.
const NAV_BUTTON = "h-(--cell-size) w-(--cell-size) aria-disabled:pointer-events-none aria-disabled:opacity-40"
const WEEKDAY = "font-sans text-xs font-normal text-secondary select-none"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  buttonVariant = "ghost-primary",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
  const defaultClassNames = getDefaultClassNames()

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "p-gutter-xs font-sans text-sm font-normal text-primary [--cell-size:var(--control-size-md)]",
        className
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) => date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn("w-fit", defaultClassNames.root),
        months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
        month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
        nav: cn("absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1", defaultClassNames.nav),
        button_previous: cn(
          buttonVariants({ variant: buttonVariant, size: "icon" }),
          NAV_BUTTON,
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: buttonVariant, size: "icon" }),
          NAV_BUTTON,
          defaultClassNames.button_next
        ),
        month_caption: cn(
          "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
          defaultClassNames.month_caption
        ),
        dropdowns: cn("flex h-(--cell-size) w-full items-center justify-center gap-1.5", defaultClassNames.dropdowns),
        dropdown_root: cn(
          "relative rounded-(--control-radius-lg) has-[>select:focus-visible]:outline-2 has-[>select:focus-visible]:outline-offset-1 has-[>select:focus-visible]:outline-ring",
          defaultClassNames.dropdown_root
        ),
        dropdown: cn("absolute inset-0 cursor-pointer bg-elevated opacity-0", defaultClassNames.dropdown),
        caption_label: cn(
          "flex items-center gap-input-xs font-sans text-sm font-medium select-none [&>svg]:text-secondary",
          defaultClassNames.caption_label
        ),
        month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
        weekdays: cn("flex", defaultClassNames.weekdays),
        weekday: cn(WEEKDAY, "flex-1", defaultClassNames.weekday),
        week: cn("mt-2 flex w-full", defaultClassNames.week),
        week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
        week_number: cn(WEEKDAY, defaultClassNames.week_number),
        day: cn("relative aspect-square h-full w-full p-0 text-center select-none", defaultClassNames.day),
        // A one-day range is both start and end; the end's shape wins, as it did in CSS order.
        range_start: cn(
          "rounded-l-full bg-secondary-soft has-[>[data-range-end=true]]:rounded-l-none",
          defaultClassNames.range_start
        ),
        range_middle: cn("bg-secondary-soft", defaultClassNames.range_middle),
        range_end: cn("rounded-r-full bg-secondary-soft", defaultClassNames.range_end),
        today: cn(defaultClassNames.today),
        outside: cn(defaultClassNames.outside),
        disabled: cn(defaultClassNames.disabled),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return <div data-slot="calendar" ref={rootRef} className={cn(className)} {...props} />
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return <HugeiconsIcon icon={ArrowLeft01Icon} className={cn("size-4", className)} {...props} />
          }

          if (orientation === "right") {
            return <HugeiconsIcon icon={ArrowRight01Icon} className={cn("size-4", className)} {...props} />
          }

          return <HugeiconsIcon icon={ArrowDown01Icon} className={cn("size-4", className)} {...props} />
        },
        DayButton: ({ ...props }) => <CalendarDayButton locale={locale} {...props} />,
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">{children}</div>
            </td>
          )
        },
        ...components,
      }}
      {...props}
    />
  )
}

const dayVariants = cva("", {
  variants: {
    today: {
      true: "before:bg-secondary-soft hover:before:bg-secondary-soft active:before:bg-secondary-soft",
    },
    outside: { true: "text-tertiary" },
  },
})

type DayVariants = VariantProps<typeof dayVariants>

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> | undefined }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      ref={ref}
      variant="ghost-primary"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "h-(--cell-size) w-full min-w-(--cell-size) font-normal",
        // Today and outside sit under the picked states, and today holds its fill through hover and press.
        dayVariants({ today: modifiers.today, outside: modifiers.outside } satisfies DayVariants),
        "data-[range-end=true]:text-on-primary-solid data-[range-end=true]:before:bg-primary-solid data-[range-start=true]:text-on-primary-solid data-[range-start=true]:before:bg-primary-solid data-[selected-single=true]:text-on-primary-solid data-[selected-single=true]:before:bg-primary-solid",
        "hover:data-[range-end=true]:before:bg-primary-solid-hover hover:data-[range-start=true]:before:bg-primary-solid-hover hover:data-[selected-single=true]:before:bg-primary-solid-hover",
        "data-[range-middle=true]:text-primary data-[range-middle=true]:before:bg-transparent",
        defaultClassNames.day,
        className
      )}
      {...props}
    />
  )
}
