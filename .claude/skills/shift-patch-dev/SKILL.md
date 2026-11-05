---
name: shift-patch-dev
description: "Use for front-end work in the ShiftPatch app: pages, components, forms, tables, styling, assets, Tailwind and design tokens, session and sign-in, API calls from the client, and time values. Trigger for: build or review a page, component or form, wire an API call, tweak styling or layout, update design tokens, or use the design system."
disable-model-invocation: false
---

# ShiftPatch Dev

Route to the matching leaf. Paths in this skill start at the repo root unless they start with `./` or `../`.

## Route

- **Web UI** (`app/`, `components/ui/`, `hooks/`, `api/`) → `references/front-end/index.md`
- **Contract questions** (routes, reply shapes, sample data, test IDs) → `SPEC.md` and `docs/ShiftPatch-Technical-Spec.md`. The technical spec wins on any contract question.
- **Run the app or sign in locally**: `pnpm dev`, then sign in with a sample account from the "Sample data" section of `docs/ShiftPatch-Technical-Spec.md`. `SPEC.md` FR-1 says what each role sees.
- **Timestamps, dates and durations** (store an instant or length of time, or show a date to a person) → `references/time.md`
