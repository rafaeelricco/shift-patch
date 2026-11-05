export { FACILITY_TIMEZONE, facilityToday }

import { DateOnly } from "@lib/time"

/** FR-4.4: the facility-local zone for this demo. Shift dates and times are never converted (time.md). */
const FACILITY_TIMEZONE = "America/New_York"

/** "Today" for FR-4.4 (claim) and FR-7.3 (upload). */
function facilityToday(): DateOnly {
  return DateOnly.todayLocal(FACILITY_TIMEZONE)
}
