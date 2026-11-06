import { expect, test } from "vitest"

import { scheduledDuration } from "./scheduled-duration"

test.each([
  ["07:00", "19:00", 12],
  ["19:00", "07:00", 12],
  ["23:30", "00:15", 0.75],
  ["07:00", "07:00", 0],
] as const)("scheduled duration from %s to %s is %s hours", (startTime, endTime, hours) => {
  expect(scheduledDuration(startTime, endTime).asHours()).toBe(hours)
})
