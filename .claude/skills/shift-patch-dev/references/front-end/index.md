# ShiftPatch web app: router

Next.js 16 App Router at the repo root. Worked code lives in each leaf. Reviewer rules live in `CLAUDE.md`, rationale in `CONVENTIONS.md`. This Next.js version differs from older ones, so read the guide in `node_modules/next/dist/docs/` before relying on a framework API (`AGENTS.md`).

## Routing table

| Task or signal                                                                 | Read                     |
| ------------------------------------------------------------------------------ | ------------------------ |
| Design tokens, visual language, component specs, shared primitives, voice      | `design-system.md`       |
| Tailwind utilities, token files, on-demand class lookup, the `bg-primary` trap | `tailwind.md`            |
| Reusable class names, or the `cn()` class-merge helper                         | code: see Code locations |
| Forms and typed API writes (`useForm`, `FormInput`, `call`, `RemoteData`)      | `forms.md`               |
| Session: `Session` union, `sid` cookie, `localStorage` cache, `useSession`, sign-out    | `session.md`             |
| `DataTable`: columns, rows, sorting, pagination, row actions                   | `tables.md`              |
| Page skeleton: role gate, `RemoteData` cell, composed `Future` reads           | `pages.md`               |
| Fonts, logo and other brand assets                                             | `design-system.md`       |
| Design system visual reference                                                 | `design-system.md`       |
| Timestamp, date or duration field, constant or helper                          | `../time.md`             |

## Workflow

1. `design-system.md` for visual constraints.
2. The leaf for the touched behavior: `forms.md`, `tables.md`, `pages.md`, `tailwind.md` or `session.md`.
3. When an audit trigger below applies, run that leaf's `## Audit` before editing.
4. Compose existing primitives before introducing new component shapes.
5. Server calls: an entry in `api` plus `call`. `forms.md` says how to add an entry.
6. Attach every required test ID (below).
7. Verify with the repo's own scripts (see Verification).

## Audit triggers

Run the named leaf's `## Audit` before editing when the work touches:

- **Forms and API → `forms.md`**: `useForm`, `FormInput`, `call`, `Future`, `RemoteData`, submit.
- **Tables → `tables.md`**: `DataTable`, `ColumnsConfig`, `columnOrder`, `rows`, sorting, pagination.
- **Pages → `pages.md`**: an `app/**/page.tsx`, the role gate, or a read that fills a `RemoteData` cell.
- **Session → `session.md`**: `lib/session.ts`, `hooks/use-session.ts`, the login form, the session cache.

## Test IDs

SPEC NFR-1 requires all 15 test IDs from `docs/ShiftPatch-Technical-Spec.md`, as `data-testid`, with their exact names, on the elements it describes. FR-1.8 says which role's screen shows which ones.

| Test ID                                                             | How it attaches                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `login-email-input`, `login-password-input`                         | `TextInput`'s `input: { "data-testid": … }`                       |
| `credential-expiry-date-input`                                      | Same, on `new TextInput({ type: "date" })`, never `DateInput`     |
| `credential-upload-input`                                           | A prop on `FileField` from `@ui/field`                            |
| `login-submit-button`, `agency-post-shift-submit-button`            | A prop on `Button`                                                |
| `shift-claim-button`, `shift-cancel-button`                         | A prop on `Button`, passed through `ShiftCard`'s `action`         |
| `agency-post-shift-button`                                          | A prop on `Button`                                                |
| `shift-list-item`                                                   | A prop on `ShiftCard`, which forwards it to the `<article>`       |
| `admin-shift-status-badge`                                          | A prop on `StatusBadge`                                           |
| `admin-dashboard-shift-table`, `audit-log-table`, `timesheet-table` | `DataTable`'s `data-testid` prop, on the `<table>` (`tables.md`)  |
| `notification-banner`                                               | A prop on `NotificationBanner`. One test ID for success and error |

## Stop and ask

- **Review-only** request: do not edit. Return findings, risks and prioritized suggestions.
- **Plan-only or plan mode**: do not edit. Return a concrete implementation plan.
- **Design drift**: a value not in the tokens, such as a new radius, grey or shadow, is drift. Stop and ask before adding it. Design values come from `app/globals.css`, as `design-system.md` describes.
- **Shared contracts** (tokens, primitives, routes, API shape, test IDs): flag the conflict and ask before normalizing. For isolated local style, follow the nearest local pattern with a scoped diff.

## Verification

- Run `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` from the repo root. `pnpm audit --audit-level=high` is a CI gate too (SPEC NFR-8). If a script is missing, say so. Don't invent one.
- Colors resolve to documented tokens. Type, weight, line-height, spacing, radius and motion match `design-system.md`. Icons are Hugeicons (`@hugeicons/react`) or the three glyphs in `@ui/icons`, not emoji or unicode glyphs.
- Forms use `@ui/forms`. API calls use `api` from `@api/endpoints` and `call` from `@api/request`.
- Every screen handles loading, empty and error states (SPEC NFR-7).
- A token edit in `app/globals.css` updates `design-system.md` in the same diff.

## Code locations

- Tokens: `app/globals.css` (authoritative). There is no mirror or token pipeline in this repo.
- Routes: `app/**/page.tsx`, with the root layout in `app/layout.tsx`. FR-1.8 needs one route, `/`, with one landing screen per role.
- Primitives and shared UI: flat in `components/ui/`, the only folder in `components/`, imported as `@ui/<name>`.
- Hooks: `hooks/use-*.ts`, imported as `@hooks/<name>`. Shared non-UI code: flat in `lib/<name>.ts`, imported as `@lib/<name>`. The client's server access: `api/endpoints.ts` and `api/request.ts`.
- A page file holds the page, its children and its helpers, even when long. Code with one importer is written in that importer. A function or component imported by two or more files gets one flat dedicated file, never a domain subfolder.
- Page files start with `export default <Page>`, other files with their `export { … }` list, both before the imports. Only a file header comment or a file-level directive (`"use client"`) sits above them. Add `"use client"` to any file using state, effects, event handlers or Base UI's interactive parts.
- `cn()`: `lib/utils.ts` (`@lib/utils`). Variants are `cva()` definitions: `buttonVariants` in `components/ui/button.tsx`, `badgeVariants` in `components/ui/status-badge.tsx`, with `STATUS_INTENT` mapping a status to its intent.
- Session: `lib/session.ts` (`@lib/session`), read through `hooks/use-session.ts`.
- Tests: `tests/`. `lib/` keeps its own `*.test.ts` beside the code.

## Scope

In: tokens, type, spacing, motion, primitives, app composites, Hugeicons, pages, and `api/`, `hooks/`, `lib/` and `components/ui/` as the client uses them.

Out: server routes, database, seed reset, infra, illustrations, stock photography. Their contracts are in `SPEC.md` and `docs/ShiftPatch-Technical-Spec.md`.
