// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

import { FACILITY_TIMEZONE, facilityToday } from "@lib/facility"

afterEach(() => {
  vi.useRealTimers()
})

// FR-4.4 and FR-7.3: "today" is the date in America/New_York, not UTC or the machine's zone.
describe("facilityToday", () => {
  it("uses America/New_York", () => {
    expect(FACILITY_TIMEZONE).toBe("America/New_York")
  })

  it("is still the previous day in New York when UTC has already rolled over", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-06T03:30:00Z")) // 22:30 on 2026-11-05 in New York (EST)
    expect(facilityToday().pretty()).toBe("2026-11-05")
  })

  it("rolls over at New York midnight", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-11-06T05:00:00Z")) // 00:00 on 2026-11-06 in New York
    expect(facilityToday().pretty()).toBe("2026-11-06")
  })

  it("follows daylight saving time", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-02T03:30:00Z")) // 23:30 on 2026-07-01 in New York (EDT)
    expect(facilityToday().pretty()).toBe("2026-07-01")
  })
})
