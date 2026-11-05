# UI record

- checked: 2026-11-05
- package.json: next 16.4.5, react 19.3.0, tailwindcss 4.3.4; no motion library

## Verdicts

- motion library: none. Transitions are CSS only.
- reduced motion: `prefers-reduced-motion` query in `app/globals.css`. Movement stops, fades stay, shimmer becomes an opacity pulse.
- font axes: system stack, no web font and no weight axis, by design (DESIGN-SYSTEM.md rule on app fonts).
- token map: project tokens win. `--transition-duration-basic` 150ms for state, `--transition-duration-relaxed` 300ms for the banner, `--cubic-enter` for arrivals.
- theme: light only, by the owner's decision on 2026-11-05. DESIGN-SYSTEM.md's dark values and rules 5, 7, 8 don't apply; it stays a mirror of base.
- radii: tight nesting declares `--outer-radius`/`--inset` on the parent (`.btn`, `.field-control` with `.field-file`). Specimen frames are 24px with a 20 to 24px gap, so the formula is exempt and contents stay 16px.
- check: DESIGN-SYSTEM.md:323 and 369-370 (press snippet) and 254 (`data-reduced-motion`) differ from the CSS; the doc was left as is.
- check: is `--color-text-tertiary` (about 3.2:1 on white) acceptable, or should it be darkened? Currently used for placeholders only.

## Inventory

- `components/ui`: button, status-badge, notification-banner, field (text, select, file), data-table, shift-card, state-message. All local.
- `app/globals.css`: `.sign-in-*`, `.section-*` and `.rise-in`, specimens only until the product screens use them.
- `app/design-system`: public specimen page, banner demo.

## Advice

- [ ] Data tables at narrow widths: nothing shows that columns are hidden. Fading edges would, on every table on a phone. impact M, effort M
- [ ] Loading button: figure-eight spinner. Character, not clarity. impact L, effort M
- [ ] Table rows: gliding highlight, only once rows are clickable. Adds the motion dependency. impact L, effort M

## Done / declined

- Sign-in card uses `radius-3xl`, so the 40px pill (20px curve) stays inside it. The 16px forms keep their 18px buttons, a known 2px bend. Owner's decision, 2026-11-05.
- Inset section sidebar, login-03 sign-in and stat cards with a badge and caption adopted from the flows, over the earlier "no sidebar" entry. It only jumps within the one landing screen (FR-1.8). No charts. Owner's decision, 2026-11-05.
- Buttons are full pills at every size, per DESIGN-SYSTEM.md rule 6, over the size table's 8px and line 396. Owner's decision, 2026-11-05.
- Badges compute from `--outer-radius` and `--inset` on a tight parent, and are pills otherwise. `--badge-radius-sm` is only the floor. Owner's decision, 2026-11-05.
