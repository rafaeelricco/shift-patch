"use client"

/**
 * A scroll area with `viewportProps` and `contentProps` to style its inner parts. A region that scrolls inside the
 * page uses it, not a raw `overflow-auto` box.
 *
 * It scrolls vertically only: the viewport forces `overflow-x-hidden`. A horizontal scroller overrides that, as
 * `Table` does with its horizontal `ScrollBar`.
 *
 * ```tsx
 * <ScrollArea viewportProps={{ className: "h-auto max-h-[calc(100dvh-4rem)]" }}>{body}</ScrollArea> // a dialog body
 * ```
 */

export { ScrollArea, ScrollBar }

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area"
import { cn } from "@lib/utils"

type ScrollAreaProps = ScrollAreaPrimitive.Root.Props & {
  viewportProps?: Omit<ScrollAreaPrimitive.Viewport.Props, "children">
  contentProps?: Omit<ScrollAreaPrimitive.Content.Props, "children">
}

function ScrollArea({ className, children, viewportProps = {}, contentProps = {}, ...props }: ScrollAreaProps) {
  const { className: viewportClassName, ...viewportRest } = viewportProps
  const { className: contentClassName, ...contentRest } = contentProps

  return (
    <ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative", className)} {...props}>
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className={cn(
          "size-full overflow-x-hidden! rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
          viewportClassName
        )}
        {...viewportRest}
      >
        <ScrollAreaPrimitive.Content
          data-slot="scroll-area-content"
          className={cn("min-w-0!", contentClassName)}
          {...contentRest}
        >
          {children}
        </ScrollAreaPrimitive.Content>
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({ className, orientation = "vertical", ...props }: ScrollAreaPrimitive.Scrollbar.Props) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "z-20 flex touch-none p-px select-none data-[orientation=horizontal]:h-2.5 data-[orientation=horizontal]:flex-col data-[orientation=vertical]:h-full data-[orientation=vertical]:w-2.5",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-(--alpha-08) transition-[background-color] duration-(--transition-duration-basic) ease-basic hover:bg-(--alpha-12) active:bg-(--alpha-16)"
      />
    </ScrollAreaPrimitive.Scrollbar>
  )
}
