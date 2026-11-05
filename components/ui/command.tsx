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
      className={cn("command flex size-full flex-col overflow-hidden", className)}
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
      <DialogContent className={cn("command-dialog", className)} showCloseButton={showCloseButton}>
        {children}
      </DialogContent>
    </Dialog>
  )
}

function CommandInput({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div data-slot="command-input-wrapper" className="p-1 pb-0">
      <InputGroup className="command-input-group">
        <CommandPrimitive.Input data-slot="command-input" className={cn("command-input", className)} {...props} />
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
  return <CommandPrimitive.Empty data-slot="command-empty" className={cn("command-empty", className)} {...props} />
}

function CommandGroup({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return <CommandPrimitive.Group data-slot="command-group" className={cn("command-group", className)} {...props} />
}

function CommandSeparator({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("command-separator", className)}
      {...props}
    />
  )
}

function CommandItem({ className, children, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item data-slot="command-item" className={cn("command-item", className)} {...props}>
      {children}
      <HugeiconsIcon icon={Tick02Icon} className="command-item-check" />
    </CommandPrimitive.Item>
  )
}

function CommandShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return <span data-slot="command-shortcut" className={cn("command-shortcut", className)} {...props} />
}
