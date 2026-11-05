"use client"

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
}

import * as React from "react"

import { Command as CommandPrimitive } from "cmdk"
import { Search01Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { cn } from "@lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@ui/dialog"
import { InputGroup, InputGroupAddon } from "@ui/input-group"
import { ScrollArea } from "@ui/scroll-area"

function Command({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn(
        "flex size-full flex-col overflow-hidden rounded-[inherit] bg-elevated p-input-xs text-primary",
        className
      )}
      {...props}
    />
  )
}

function CommandDialog({
  title = "Command Palette",
  description = "Search for a command to run...",
  children,
  className,
  showCloseButton = false,
  ...props
}: Omit<React.ComponentProps<typeof Dialog>, "children"> & {
  title?: string
  description?: string
  className?: string
  showCloseButton?: boolean
  children: React.ReactNode
}) {
  return (
    <Dialog {...props}>
      <DialogHeader className="sr-only">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogContent
        className={cn("top-1/3 -translate-x-1/2 translate-y-0 p-0", className)}
        showCloseButton={showCloseButton}
      >
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="h-control-md has-[[data-slot=command-input]:focus-visible]:outline-2 has-[[data-slot=command-input]:focus-visible]:-outline-offset-1 has-[[data-slot=command-input]:focus-visible]:outline-ring">
        <CommandPrimitive.Input
          data-slot="command-input"
          className={cn(
            "h-full w-full min-w-0 flex-1 bg-transparent px-gutter-2xs font-sans text-sm font-normal text-primary outline-none placeholder:text-tertiary disabled:cursor-not-allowed disabled:text-disabled",
            className
          )}
          {...props}
        />
        <InputGroupAddon>
          <HugeiconsIcon icon={Search01Icon} />
        </InputGroupAddon>
      </InputGroup>
    </div>
  )
}

function CommandList({ className, children, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <ScrollArea
      className="min-h-0"
      viewportProps={{
        tabIndex: -1,
        className: cn(
          "h-auto max-h-[min(18rem,calc(var(--available-height,100dvh)-0.5rem))] scroll-py-1 outline-none",
          className
        ),
      }}
      contentProps={{ render: <CommandPrimitive.List data-slot="command-list" {...props} /> }}
    >
      {children}
    </ScrollArea>
  )
}

function CommandEmpty({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn("py-6 text-center font-sans text-sm font-normal text-secondary", className)}
      {...props}
    />
  )
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "overflow-hidden p-input-xs text-primary **:[[cmdk-group-heading]]:px-gutter-xs **:[[cmdk-group-heading]]:py-gutter-2xs **:[[cmdk-group-heading]]:font-sans **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-secondary",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("-mx-input-xs h-px bg-default", className)}
      {...props}
    />
  )
}

function CommandItem({ className, children, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "group/item relative flex min-h-(--app-menu-item-height) cursor-default items-center gap-(--menu-item-gap) rounded-(--menu-item-radius) p-(--app-menu-item-padding) font-sans text-sm font-normal text-primary outline-none select-none",
        "[&_svg]:pointer-events-none [&_svg]:size-icon-sm [&_svg]:shrink-0",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:text-disabled data-[selected=true]:bg-(--menu-item-background-color)",
        className
      )}
      {...props}
    >
      {children}
      <HugeiconsIcon
        icon={Tick02Icon}
        className="ml-auto opacity-0 group-has-[[data-slot=command-shortcut]]/item:hidden group-data-[checked=true]/item:opacity-100"
      />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn(
        "ml-auto font-sans text-xs font-normal tracking-(--tracking-wide) text-secondary group-data-[selected=true]/item:text-primary",
        className
      )}
      {...props}
    />
  )
}
