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
        className={cn("scroll-area-viewport size-full overflow-x-hidden!", viewportClassName)}
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
      className={cn("scroll-area-scrollbar", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="scroll-area-thumb" />
    </ScrollAreaPrimitive.Scrollbar>
  )
}
