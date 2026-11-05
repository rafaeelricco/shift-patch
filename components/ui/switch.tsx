"use client"

export { Switch }

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@lib/utils"

/** The track sets the --switch-* geometry; the thumb reads it by inheritance. */
const switchVariants = cva(
  cn(
    "peer relative inline-flex h-(--switch-track-height) w-(--switch-track-width) shrink-0 cursor-pointer items-center rounded-full bg-(--switch-track-color)",
    "transition-[background-color] duration-(--transition-duration-basic) ease-basic",
    "after:absolute after:-inset-x-3 after:-inset-y-2",
    "data-checked:bg-(--switch-track-color-checked)",
    "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
    "aria-invalid:ring aria-invalid:ring-border-danger-outline-hover aria-invalid:focus-visible:outline-ring-danger",
    "data-disabled:cursor-not-allowed data-disabled:bg-(--switch-track-color-disabled) data-checked:data-disabled:bg-(--switch-track-color-checked-disabled)",
    "hover:not-data-checked:not-data-disabled:bg-(--switch-track-color-hover)"
  ),
  {
    variants: {
      size: {
        default: "",
        sm: "[--switch-thumb-size:calc(var(--switch-track-height)_-_2_*_var(--switch-thumb-offset))] [--switch-track-height:var(--control-icon-size-xs)] [--switch-track-width:var(--control-size-2xs)]",
      },
    },
    defaultVariants: { size: "default" },
  }
)

function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & VariantProps<typeof switchVariants>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(switchVariants({ size }), className)}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none ml-(--switch-thumb-offset) block size-(--switch-thumb-size) rounded-full bg-(--switch-thumb-color) transition-transform duration-(--transition-duration-basic) ease-move data-checked:translate-x-[calc(var(--switch-track-width)_-_var(--switch-thumb-size)_-_2_*_var(--switch-thumb-offset))] data-disabled:bg-(--switch-thumb-color-disabled) motion-reduce:duration-0"
      />
    </SwitchPrimitive.Root>
  )
}
