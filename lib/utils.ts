export { cn }

import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/** The `--spacing-*` names in `app/globals.css`'s `@theme`, so `cn("h-control-lg", "h-control-2xs")` keeps only the last. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [
        "control-4xs",
        "control-2xs",
        "control-sm",
        "control-md",
        "control-lg",
        "control-xl",
        "gutter-2xs",
        "gutter-xs",
        "gutter-sm",
        "gutter-md",
        "gutter-lg",
        "gutter-xl",
        "input-xs",
        "input-sm",
        "input-md",
        "icon-xs",
        "icon-sm",
        "icon-lg",
        "icon-2xl",
        "icon-md",
        "icon-xl",
        "control-2xl",
        "control-3xl",
        "control-3xs",
        "control-xs",
        "site-header-h",
        "site-toc-button-h",
        "site-header-h-mobile",
        "site-button-height",
        "site-button-height-sm",
        "input-lg",
        "site-anchor-scroll-clearance",
        "site-spacing",
        "site-spacing-nav-l2-width",
        "site-spacing-v",
        "site-page-padding-x",
        "site-page-padding-x-md",
        "site-section-gap",
        "site-section-header-gap",
        "site-grid-gap",
        "site-button-padding-x",
      ],
    },
  },
})

const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs))
