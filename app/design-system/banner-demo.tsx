"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { type Notice, NotificationBanner } from "@/components/ui/notification-banner"

const OUTCOMES = {
  valid: { kind: "success", message: "Shift claimed" },
  lapsed: { kind: "error", message: "Credential expired, cannot claim shift" },
} as const satisfies Record<string, Notice>

export function BannerDemo() {
  const [shown, setShown] = useState<{ notice: Notice; attempt: number }>({ notice: OUTCOMES.valid, attempt: 0 })
  const show = (notice: Notice): void => setShown(({ attempt }) => ({ notice, attempt: attempt + 1 }))

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => show(OUTCOMES.valid)}>Claim as Maria Lopez</Button>
        <Button variant="outline-primary" onClick={() => show(OUTCOMES.lapsed)}>
          Claim as James Cook
        </Button>
      </div>
      <NotificationBanner key={shown.attempt} notice={shown.notice} />
    </div>
  )
}
