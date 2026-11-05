export { PageShell }

import type { ReactNode } from "react"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

function PageShell({
  title,
  Icon,
  children,
}: {
  readonly title: string
  readonly Icon: IconSvgElement
  readonly children: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <h1 className="flex items-center gap-2 type-heading-md">
        <HugeiconsIcon icon={Icon} className="size-5" aria-hidden="true" />
        {title}
      </h1>
      {children}
    </div>
  )
}
