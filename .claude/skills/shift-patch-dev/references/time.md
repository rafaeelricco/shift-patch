# Time types: POSIX, Duration and DateOnly

Value-type rules for the whole repo. Import from `@lib/time` (`lib/time.ts`). Use this leaf when a field, constant, variable or schema is an instant, a calendar date or a length of time.

## Which type

| The value is                                   | Type                                  | Example                       |
| ---------------------------------------------- | ------------------------------------- | ----------------------------- |
| An instant                                     | `POSIX`                               | An audit entry's time         |
| A length of time                               | `Duration`                            | Scheduled hours, a poll delay |
| A calendar date with no time                   | `DateOnly`                            | A credential's expiry date    |
| A time on the clock                            | `TimeOfDay`                           | A form's start time           |
| A shift's `date`, `startTime`, `endTime` reply | `string`, exactly as the API sends it | `2026-10-03`, `07:00`         |

## Prefer typed storage

Store a **timestamp** as `POSIX`, not a plain `number`. Store a **duration** as `Duration`, not a plain `number`. Convert to milliseconds only at the boundary that needs raw ms (`posix.value`, `duration.asMilliseconds()`). If you cannot, comment at the storage site (`// plain ms: <reason>`).

```ts
import { POSIX, Duration } from "@lib/time"

const now = POSIX.now()
const later = now.addDuration(Duration.hours(1))
const epochMs = later.value // only at a boundary that needs raw ms

const offset = Duration.minutes(30)
const ms = offset.asMilliseconds() // only at a boundary that needs raw ms
```

Do not invent methods.

- `POSIX` holds epoch milliseconds as `readonly value: number`. There is no `POSIX#asMilliseconds()`.
- `Duration` is constructed through factories (`Duration.hours(1)`, `Duration.minutes(30)`, and so on) and converts with `asMilliseconds()`, `asSeconds()`, `asHours()` and the like.
- `DateOnly` has `compare`, `greaterThan`, `addMonths`, and `pretty()` for `YYYY-MM-DD`. There is no `addDays`.
- `TimeOfDay` has a public `seconds` field and `pretty()`, which prints `HH:mm:ss`. The API's `HH:mm` is `time.pretty().slice(0, 5)`.
- Schemas: `POSIX.schema` (a number), `Duration.schema` (an ISO-8601 string), `DateOnly.schema` (`YYYY-MM-DD`).

## Where this applies

| Layer                      | Prefer                                               | Convert at boundary                                      |
| -------------------------- | ---------------------------------------------------- | -------------------------------------------------------- |
| `api/endpoints.ts` schemas | `POSIX.schema`, `Duration.schema`, `DateOnly.schema` | Clients get typed values                                 |
| Shift contract fields      | `s.string`, sent as the spec shows                   | The technical spec fixes these as strings                |
| UI helpers                 | Keep `POSIX` or `Duration` in memory                 | A `Date` or `setTimeout` → `.value`, `.asMilliseconds()` |
| Form submit mappers        | `DateOnly`, `TimeOfDay` from the fields              | `date.pretty()`, `time.pretty().slice(0, 5)`; `forms.md` |

## Facility-local time

Everything a person reads about a shift is facility-local. The technical spec says all its times are 24-hour, facility-local, with no timezone conversion, and SPEC FR-4.4 names the zone for this demo: `America/New_York`.

- **A shift's date and times are never converted.** They arrive as `2026-10-03`, `19:00` and `07:00`, and render as they came: `2026-10-03`, `19:00 to 07:00`, in tabular numerals. Don't pass them through `Date`, which reads them in the viewer's zone.
- **"Today" is the facility's today**, for FR-4.4 and FR-7.3: `DateOnly.todayLocal("America/New_York")`, not `new Date()` or `DateOnly.todayUTC()`. No constant holds the zone yet. Give it one flat file in `lib/` once two files need it.
- **An instant shows in the facility's zone.** An audit entry's `POSIX` renders through `toLocalDateAndTime`:

  ```ts
  const { date, time } = at.toLocalDateAndTime("America/New_York")
  const label = `${date.pretty()} ${time.pretty().slice(0, 5)}`
  ```

- **Scheduled hours wrap past midnight** (FR-9.2). `19:00` to `07:00` is 12 hours, because an end before the start means the next day. Hours are labelled scheduled, because nobody clocks in. `tables.md` has the helper.

## Documented exceptions

Plain `number` (epoch ms or duration ms) is allowed only when:

1. A third-party or platform API requires raw ms or `Date`, and the typed value is converted **at the call site**, not stored earlier as `number`; or
2. A legacy field cannot change yet. Comment why (`// plain ms: <reason>`).

Animation and CSS ms, and non-domain timers, are out of scope unless they represent domain time.

```ts
// Bad: store epoch ms as number through the app
const uploadedAt: number = Date.now()
const pollEveryMs = 3_000

// Good: store typed; convert at the edge
const uploadedAt = POSIX.now()
const pollEvery = Duration.seconds(3)
window.setInterval(refresh, pollEvery.asMilliseconds())
```

Form dates at submit: `front-end/forms.md`.
