export { scheduledDuration }

import { Duration } from "@lib/time"

function scheduledDuration(startTime: string, endTime: string): Duration {
  const minutesOf = (time: string): number => {
    const [hours = 0, minutes = 0] = time.split(":").map(Number)
    return hours * 60 + minutes
  }

  const span = minutesOf(endTime) - minutesOf(startTime)
  return Duration.minutes(span < 0 ? span + 24 * 60 : span)
}
