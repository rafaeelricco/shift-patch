"use client"

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  selectTrigger,
}

import * as React from "react"

import { Select as SelectPrimitive } from "@base-ui/react/select"
import { ArrowDown01Icon, ArrowUp01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@lib/utils"
import { menuItem, menuLabel, menuSeparator } from "@ui/dropdown-menu"
import { fieldControl } from "@ui/input"
import { popupSurface } from "@ui/popover"
import { ScrollArea } from "@ui/scroll-area"

/** A field control sized to its value; shared by SelectTrigger and the forms triggers. */
const selectTrigger = cn(
  fieldControl,
  "inline-flex w-fit cursor-pointer items-center justify-between gap-input-sm pr-gutter-xs whitespace-nowrap select-none",
  "data-placeholder:text-tertiary",
  "[&_svg]:pointer-events-none [&_svg]:size-icon-sm [&_svg]:shrink-0"
)

// The size keys on data-size so it outranks fieldControl's height; twMerge does not merge custom spacing names.
const selectTriggerVariants = cva(selectTrigger, {
  variants: { size: { default: "", sm: "data-[size=sm]:h-control-sm data-[size=sm]:text-sm" } },
  defaultVariants: { size: "default" },
})

const selectScrollArrow = "cursor-default bg-elevated py-input-xs [&>svg]:size-icon-sm"

const Select = SelectPrimitive.Root

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return <SelectPrimitive.Group data-slot="select-group" className={cn("scroll-my-1", className)} {...props} />
}

function SelectValue({ className, ...props }: SelectPrimitive.Value.Props) {
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      className={cn("flex min-w-0 flex-1 items-center gap-1.5 truncate text-left", className)}
      {...props}
    />
  )
}

/** @property icon - Opt-in replacement for the default chevron. */
function SelectTrigger({
  className,
  size = "default",
  icon,
  children,
  ...props
}: SelectPrimitive.Trigger.Props &
  VariantProps<typeof selectTriggerVariants> & {
    icon?: React.ReactElement
  }) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(selectTriggerVariants({ size }), className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={icon ?? <HugeiconsIcon icon={ArrowDown01Icon} className="pointer-events-none size-4 text-secondary" />}
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<SelectPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger">) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            popupSurface,
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 overflow-hidden data-[align-trigger=true]:transition-none",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <ScrollArea
            className="h-full max-h-[inherit]"
            viewportProps={{
              render: (viewportProps) => {
                // Select's aligned list uses per-axis styles; remove the viewport's overflow shorthand.
                const { overflow: _overflow, ...style } = viewportProps.style ?? {}
                return (
                  <SelectPrimitive.List
                    {...viewportProps}
                    style={{ ...style, overflowX: "hidden", overflowY: "scroll" }}
                  />
                )
              },
              role: "listbox",
              tabIndex: -1,
              className: "max-h-[inherit]",
            }}
            contentProps={{ className: "p-1.5" }}
          >
            {children}
          </ScrollArea>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return <SelectPrimitive.GroupLabel data-slot="select-label" className={cn(menuLabel, className)} {...props} />
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn(menuItem, "w-full pr-8", className)} {...props}>
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={<span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />}
      >
        <HugeiconsIcon icon={Tick02Icon} />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn(menuSeparator, "pointer-events-none -mx-1.5", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(selectScrollArrow, "top-0 z-10 flex w-full items-center justify-center", className)}
      {...props}
    >
      <HugeiconsIcon icon={ArrowUp01Icon} />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(selectScrollArrow, "bottom-0 z-10 flex w-full items-center justify-center", className)}
      {...props}
    >
      <HugeiconsIcon icon={ArrowDown01Icon} />
    </SelectPrimitive.ScrollDownArrow>
  )
}
