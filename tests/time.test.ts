import { describe, expect, it } from "vitest"

import * as s from "@lib/json/schema"
import { DateOnly } from "@lib/time"

const date = (iso: string): DateOnly =>
  s.decode(DateOnly.schema, iso).either(
    (e) => {
      throw new Error(e)
    },
    (d) => d
  )

describe("DateOnly.addDays", () => {
  it.each([
    ["2026-12-31", 1, "2027-01-01"],
    ["2028-02-28", 1, "2028-02-29"],
    ["2026-11-01", 1, "2026-11-02"], // the US DST change
    ["2026-03-01", -1, "2026-02-28"],
    ["2026-11-05", 0, "2026-11-05"],
  ])("%s %+d is %s", (from, days, to) => {
    expect(date(from).addDays(days).pretty()).toBe(to)
  })
})
