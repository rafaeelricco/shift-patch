"use client"

export { Toaster }

import { Toaster as Sonner } from "sonner"
import { AlertCircleIcon, CheckCircleIcon } from "@ui/icons"

function Toaster() {
  return (
    <Sonner
      theme="light"
      position="top-center"
      offset={{ top: 68 }}
      mobileOffset={{ top: 64, left: 16, right: 16 }}
      visibleToasts={1}
      toastOptions={{
        classNames: {
          toast: "bg-card! text-primary! border-default! rounded-xl! shadow-hairline! font-sans! text-sm!",
          description: "text-secondary!",
          actionButton: "bg-primary-solid! text-on-primary-solid!",
        },
      }}
      icons={{
        success: <CheckCircleIcon className="size-4 text-icon-success" />,
        error: <AlertCircleIcon className="size-4 text-icon-error" />,
      }}
    />
  )
}
