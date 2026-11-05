# app

Rules a reviewer can check on a diff. Rationale and examples for most live in `CONVENTIONS.md` and the design system at `.claude/skills/shift-patch-dev/references/front-end/design-system.md`.

## Types and state

- No `any`, no parameter properties (`erasableSyntaxOnly`). Entity IDs use `Id<Tag>`, not `string & { __brand }`.
- Fallible operations return `Result`. `throw` only for programmer errors and platform boundaries (`JSON.parse`, `fetch`).
- Async UI state is `RemoteData`; related state is one union, not loose `isLoading`/`isError` flags.
- Cross-folder imports use the `@api`, `@hooks`, `@lib`, `@ui` aliases, not `../../` paths.
- Server endpoints are reached through `api` from `@api/endpoints` and `call` from `@api/request`.

## Layout

- A page file holds the page, its child components, and helpers used only there, even when the file is long. Never split a screen into sibling files for length, readability, or one component per file.
- A function or component imported by two or more files (count files, not call sites) gets one dedicated file named for its export. Non-UI: flat `lib/<name>.ts`, except hooks: every `use-*` file lives in `hooks/`. Shared UI: flat `components/ui/<name>.tsx`. No domain subfolders. Code with one importer is written in that importer.
- `components/` contains only `ui/`. `cn` is `@lib/utils`.
- Component tests (`*.test.tsx`) live in `tests/`.
- Page files start with `export default <Page>`; every other file starts with its `export { … }` list. Both come before the imports; only a file header comment or a file-level directive (`"use client"`, `"use cache"`) may sit above them.
- One route per `app/**/page.tsx`. A piece two pages share sits beside them.

## UI

- Scrollable regions use `ScrollArea` from `@ui/scroll-area`, not raw `overflow-auto` containers.
- Radius uses the design-system steps: 4 file button, 8 inputs, 12 banners, 16 cards and tables, 24 large frames, full for buttons and badges. A new radius lands on an existing step.
- Components use semantic color tokens, never the primitive ramps.
- A token added or changed in `app/globals.css` is documented in the design system in the same diff.
- Machine-readable values (ids, paths, URLs, enums, hashes) render in `font-mono`. Prose never does.
- Dates and times render in the sans face with `tabular-nums`, as `2026-10-03` and `07:00 to 19:00`.
- Table counts render with `toLocaleString()` only and right-align with `align: "right"` on the `ColumnDef` plus `tabular-nums`. Composite and interactive cells (a status dropdown, a badge beside a label) keep default alignment.
