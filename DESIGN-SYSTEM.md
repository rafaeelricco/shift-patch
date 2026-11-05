---
name: base-design-system
description: Design-system reference for building UIs in the visual language of base (product "app" system and marketing "site" system). Tokens (light + dark), type, layout, depth, motion, component recipes and a Tailwind v4 bridge. Use it when you write HTML/CSS/JSX that should look like base.
metadata:
  version: 2026-10-01
  source: computed styles captured on 2026-10-01
alwaysApply: false
applyTo: "**/*.{html,css,jsx,tsx,vue,svelte}"
---

# Base design system reference

Two related systems that share one visual DNA: **near-monochrome ink on a white ground, brand color on the primary action, other color reserved for meaning, soft geometry, and very quiet depth.** Framework-agnostic: plain CSS custom properties plus an optional Tailwind v4 bridge. Values are resolved from live computed CSS; token names mirror the source so a later parity check is a one-to-one lookup.

| System   | Source | Character                                                                                                |
| -------- | ------ | -------------------------------------------------------------------------------------------------------- |
| **app**  | base   | Dense product UI. System font, 14/16px text, pill and rounded-rect controls, layered greys, soft shadow. |
| **site** | base   | Editorial marketing. Brand sans at 17px body, fluid medium-weight headlines, pure black/white, big air.  |

## When to use this skill

- Building product UI that should feel like the base app (chat, sidebar, composer, menus, settings) → **app**.
- Building a landing page, blog, docs index or marketing page that should feel like the base site → **site**.
- If the user mentions: base look, base style, composer, ink, pill buttons, use this skill.

## Install

This file is the whole kit. To get CSS files, regenerate them from **Token reference** at the bottom:

1. For the chosen system, write every `--name: light` into `:root { color-scheme: light; ... }`.
2. Write every value after `|` into `.dark, [data-theme="dark"] { color-scheme: dark; ... }`. A token without `|` keeps its light value in dark.
3. Expand the shorthand: `#hex/N%` = `color-mix(in oklab, #hex N%, transparent)`; `fluid(Apx→Bpx)` = `clamp(Apx, calc(Apx + ((B-A)/16) * ((100vw - 375px) / 66.5625)), Bpx)` (linear from a 375px to a 1440px viewport); `--prefix-*: k=v; ...` = `--prefix-k: v` for each pair.
4. Site only: `:root` also sets `font-feature-settings: "liga" on, "calt" on`.
5. Theme with a `dark` class or `data-theme="dark"` on `<html>` (set both if unsure).

Plain CSS:

```css
@import "./tokens/app.css"; /* or site.css: ONE system per surface */
```

Tailwind v4 (configured in CSS, no tailwind.config.js):

```css
@import "tailwindcss";
@import "./design/tokens/app.css"; /* or site.css */
@import "./design/tailwind/app.theme.css"; /* or site.theme.css, see "Tailwind bridge" */
```

## Usage rules

1. Pick **one system per surface**. `app.css` and `site.css` reuse names (`--radius-*`, `--font-sans`, `--spacing`, `--ease-in-out`, `--text-xl`) with different values; loading both makes the later one win.
2. Use semantic tokens (app intent matrix and surface/text/border tokens; site ink ladder and `--color-cta-*`), never raw hex. Primitives (hue ramps) are for charts and illustration.
3. **The primary action uses the logo's calendar color**: navy `#0a2646` with a white label in light, teal `#03b4ba` with a navy label in dark. Body text stays neutral ink. Never put a white label on teal (2.55:1). **Blue `#3a83f7` is never the primary button**; it is only for focus rings, links, info states, inline references and the checked switch.
4. App text: **16px for content, 14px for chrome**. Site body: **17px/28px**. App headings weight 600; site headings weight 500 at every size. Nothing relies on bold.
5. Borders are 5 / 10 / 15% ink. Hairlines may be 0.5px. Shadows stay under ~12% alpha in light; dark mode uses a faint inner light ring (`inset 0 0 1px #fff3`) instead of drop shadows.
6. Composer, action buttons, toggles and site CTAs are **pills**. Menus/modals 16px radius, rows 8–10px, site media 6px. Full-bleed site media is square.
7. Dark mode is near-black, not grey: app ground `#0e0e0e`, site ground `#000`; raised layers step to `#212121` / `#303030`.
8. Every new color token needs a light and a dark value. New radii land on existing steps.
9. Hover styles go inside `@media (hover:hover) and (pointer:fine)`. Respect `prefers-reduced-motion` (swap movement for opacity).
10. If a token file and the prose here disagree on a value, the token wins; the prose wins on intent.

## Stop and ask

- **Design drift:** a value not in the tokens (new radius, grey, shadow) is not an automatic winner. Ask before adding it.
- **Mixing systems:** pulling site typography into the app (or the reverse) changes the character. Confirm it is intended.
- **Brand assets:** the base name, wordmark, blossom logo, app icon and site imagery are base property. This kit ships none; use your own name, mark and imagery.

---

## Colors · app (base)

### Gray and alpha ramps

- `--gray-0 … --gray-1000`, 25 steps (0, 25, 50, 75, 100, 150 … 950, 975, 1000). **Inverts in dark**: `--gray-0` is `#fff` light / `#0d0d0d` dark; `--gray-500` `#5d5d5d` is the pivot. A component can reference a gray step and get a sensible value in both themes.
- `--alpha-NN` = ink at NN% (ink `#0d0d0d` light, `#ededed` dark). Steps 0, 01, 02, 04, 05, 06, 08, 10, 12, 15, 16, 20, 25, 30, 35, 40, 50, 60, 70. Borders use 5/10/15%, hovers 5% and 12%, the mode-toggle track 3%.

### Surfaces

| Token                                       | Light             | Dark      | Use                                                |
| ------------------------------------------- | ----------------- | --------- | -------------------------------------------------- |
| `--color-surface`                           | `#fcfcfc`         | `#0e0e0e` | App ground, main pane. Off-white, never pure white |
| `--color-surface-tertiary`                  | `#f9f9f9`         | `#212121` | Shell behind panes, editor wells                   |
| `--app-color-background-shell`              | `#f9f9f9`         | `#000`    | Outermost window chrome                            |
| `--color-surface-elevated` / `-card`        | `#fff`            | `#212121` | Cards, popovers, menus                             |
| `--color-background-composer-surface`       | `#fff`            | `#212121` | Prompt composer                                    |
| `--app-color-background-elevated-secondary` | `#f3f3f3`         | `#303030` | Secondary raised fill, chips                       |
| `--color-background-control-opaque`         | `#fff`            | `#303030` | Inputs, selects                                    |
| `--color-background-callout-surface`        | `#f3f3f3`         | `#414141` | Callouts, quoted blocks                            |
| Sidebar panel                               | `--gray-25` @ 65% | (inverts) | Translucent so the shell tint shows through        |

Ground is `#fcfcfc`; anything floating or typed into is pure `#fff`; the jump between them is carried by a soft shadow, not a border.

### Text and icons

`--color-text-primary` `#0d0d0d`/`#ededed` (body, titles, active nav) · `-secondary` `#5d5d5d`/`#cdcdcd` (supporting copy) · `-tertiary` `#8f8f8f`/`#afafaf` (section labels, placeholders, quiet icons) · `-disabled` same as tertiary · `-inverse` `#fff`/`#0d0d0d` (on solid ink) · `--app-color-text-accent` `#2c67c5`/`#63a8f8` (links). Sidebar history rows: ink @ 85%. Icons follow the same tiers: `--app-color-icon-{primary,secondary,tertiary,accent,success,warning,error}`.

### Borders, hairlines, focus

`--color-border-subtle` 5% (quiet separators) · `--color-border` 10% light / white 15% dark (**default** rule: menus, cards, dividers) · `--color-border-strong` 15% / 20% (outline buttons, inputs, radios) · `--shadow-hairline` `0 0 0 .5px` @10% (hairline drawn as a shadow) · main-pane divider `0.5px solid` @10% · `--color-ring` `#3a83f7` focus ring (danger intent `#ff8583`). Half-pixel hairlines are a signature.

### Intent matrix

Every interactive color comes from one grid: **8 intents × 6 variants**, each with hover/active states: `--color-{background|text|border}-{intent}-{variant}[-hover|-active]`.

- Intents: `primary` (navy in light, teal in dark), `secondary` (grey), `info` (blue), `success` (green), `warning` (orange), `caution` (yellow), `danger` (red), `discovery` (purple).
- Variants: `solid` (filled), `soft` (opaque tint), `soft-alpha` (translucent tint), `outline` (border only), `ghost` (no fill until hover), `surface` (very light tint + matching border, for banners). `primary`/`secondary` also have `soft-alt`; `success` has `indicator`.

| Intent    | Solid     | Solid hover | Status text light/dark | Surface light/dark  |
| --------- | --------- | ----------- | ---------------------- | ------------------- |
| primary   | `#0a2646` | `#1b3a5e`   | `#0d0d0d`/`#ededed`    | ink 5% / 8%         |
| secondary | `#f3f3f3` | ink 5%      | `#5d5d5d`/`#cdcdcd`    | —                   |
| info      | `#3a83f7` | `#0169cc`   | `#2c67c5`/`#63a8f8`    | `#e8f3fe`/`#133463` |
| success   | `#008635` | `#00a240`   | `#00a240`/`#40c977`    | `#edfaf2`/`#011c0b` |
| warning   | `#e25507` | `#b9480d`   | `#e25507`/`#ff8549`    | `#fff5f0`/`#281105` |
| caution   | `#ffc300` | `#916f00`   | `#ffc300`/`#ffd240`    | yellow 8% / 15%     |
| danger    | `#e02e2a` | `#e02e2a`   | `#e02e2a`/`#ff6764`    | `#fff0f0`/`#280b0a` |
| discovery | `#924ff7` | `#8046d9`   | `#924ff7`/`#ad7bf9`    | purple 6% / 15%     |

Ghost hover = ink 5% (`#0000000d`), ghost active = ink 12%. Soft-alpha uses the hue's anchor at 13–16%.

### Hue primitives and charts

Seven ramps `--{blue,green,red,orange,yellow,purple,pink}-{25…1000}`, constant across themes, plus alpha twins `-a25…-a300`. Anchors (400): blue `#0285ff`, green `#04b84c`, red `#fa423e`, orange `#fb6a22`, yellow `#ffc300`, purple `#924ff7`, pink `#ff66ad`. Charts: `--color-chart-sequential-1..4`, blue, reversed in dark (light `#cce6ff #66b5ff #0285ff #004f99`; dark `#013566 #004f99 #0285ff #66b5ff`).

### Chat-specific colors

`--color-background-composer-primary` `#0a2646`/`#03b4ba` with `--color-text-composer-primary` `#fff`/`#0a2646` (send/voice button) · `--color-background-user-message` `#000` on the web build / `rgb(50 50 50 / 85%)` dark, text `#fff` (the base theme also defines a softer `rgb(233 233 233 / 50%)` bubble with ink text used by other shells) · `--color-background-text-selection` `#afafaf66`/`#41414166` (neutral, not blue; base theme declares `#539af859`) · `--color-background-mode-toggle-track` ink 3% / `#1b1b1b` · `--color-text-composer-reference` `#3a83f7`/`#63a8f8` (@-mentions, file refs).

## Colors · site (base)

### Ground and ink ladder

Pure white and pure black. Every neutral is black at a fixed opacity (`--color-primary-N`) or the solid grey that opacity makes on white (`--color-primary-solid-N`). Dark swaps black for white.

| Step | `--color-primary-N` light | Solid     | Dark      | Use                                       |
| ---- | ------------------------- | --------- | --------- | ----------------------------------------- |
| 2    | black 2%                  |           | white 8%  | Barely-there wash                         |
| 4    | black 4% `#0000000a`      | `#f5f5f5` | white 12% | **Secondary button fill**, chips          |
| 12   | black 12%                 | `#e0e0e0` | white 20% | Dividers, strokes                         |
| 44   | black 44%                 | `#8f8f8f` | white 44% | Decorative icons, disabled                |
| 60   | black 60%                 | `#666`    | white 60% | **Meta text**: dates, captions, hover dim |
| 80   | black 80%                 | `#333`    | white 80% | Long-form secondary copy                  |
| 100  | `#000`                    | `#000`    | `#fff`    | **Body, headlines**                       |

- `--color-background` `#fff`/`#000`. `--color-secondary-N` is the inverse ladder (white at N%) for text and buttons over photography/video. `--color-tertiary-100` `#f1f1f1`/`#1f1f1f` is the quiet panel fill. Scrims: `--color-scrim-dark` black 35%, `--color-scrim-dark-75` black 75%.

### Brand ramps

Nine hues `blue purple pink orange yellow green red teal gray`, steps 25–1000, anchored at **400**: blue `#3a83f7`, purple `#8952ee`, pink `#f077af`, orange `#ee7c37`, yellow `#f6c543`, green `#53b559`, red `#fa423e`, teal `#0fd9ae`, gray `#8f8f8f`. `--color-primitive-*` holds the constant values; `--color-brand-*` is theme-aware and **mirrors around 400 in dark** (brand-blue-25 → primitive-blue-1000), so a light tint stays a low-contrast tint in both themes. Use `--color-brand-*` in components. Chart ramps `--color-{blue,yellow,orange,green,pink,gray}-{20,40,60,80,100}` reverse in dark.

### Illustration hues, syntax, diff

- Hues (art cards, diagrams, softened in dark): red `#f53255`, lime `#9dca1c`, magenta `#eb56c5`, blue `#29bdfd`, yellow `#ffaf00`.
- Code syntax light/dark: keyword `#1e60e4`/`#4080ff`, function `#7a4ff5`/`#916bff`, string `#027f41`/`#03a354`, const `#d6008d`/`#ff00a8`, operator `#c93b00`/`#ed4b00`, variable `#8a6e07`/`#ac8601`, data `#1d7899`/`#2392ba`, error `#f22f4d`/`#e80d2f`, comment ink 44%.
- Diff: add `#e6ffec`/`#14261f`, delete `#ffebe9`/`#311b1f`.

## Typography

### Families

| System | Token              | Stack                                                                                                   | Use                                            |
| ------ | ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| app    | `--font-sans`      | `-apple-system-body, ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif` | **All product UI** (native face, no web fonts) |
| app    | `--font-base-sans` | `"Inter Variable", "Inter", <system stack>`                                                             | Brand moments only (onboarding, promos)        |
| app    | `--font-mono`      | `ui-monospace, "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`              | Code                                           |
| site   | `--font-sans`      | `"Inter Variable", "Inter", -apple-system, system-ui, sans-serif`                                       | **Everything** on the site; `liga` + `calt` on |
| site   | `--font-lf`        | `"LF Serif", "Source Serif 4", Georgia, serif`                                                          | Rare editorial accents                         |
| site   | `--font-mono`      | `"SF Mono", Consolas, "Liberation Mono", ui-monospace, monospace`                                       | Code snippets                                  |

### App scale (`--font-{heading|text|small-caps}-{step}-{size|line-height|weight|tracking}`)

| Step                    | Size/line           | Wt  | Tracking       | Use                               |
| ----------------------- | ------------------- | --- | -------------- | --------------------------------- |
| heading-5xl / 4xl / 3xl | 72/72, 60/60, 48/48 | 600 | -0.025em       | Display                           |
| heading-2xl             | 36/42               | 600 | -0.025em       |                                   |
| heading-xl              | 32/38               | 600 | -0.025em       | Page hero                         |
| heading-lg              | 24/28               | 600 | 0              | Section / dialog title            |
| heading-md / sm         | 20/26, 18/26        | 600 | 0              |                                   |
| heading-xs              | 16/24               | 600 | 0              | Card / form title                 |
| text-lg                 | 18/29               | 400 | 0              | Large reading                     |
| text-md                 | 16/24               | 400 | 0              | **Chat messages, composer, body** |
| text-sm                 | 14/20               | 400 | 0              | **Sidebar, menus, buttons**       |
| text-xs / 2xs / 3xs     | 12/18, 10/14, 8/12  | 400 | +0.025em       | Captions, badges, micro           |
| small-caps-lg / md      | 13/19, 11/15        | 600 | 0.6px / 0.65px | Uppercase labels                  |

Empty-state greeting is 24px at **weight 400** ("calm, not bold"). Sidebar section headers 14px/500 tertiary. Button labels 14px/500.

### Site scale (fluid, `--type-{role}-{size|line|track|weight}`)

Headings interpolate linearly between a 375px and 1440px viewport. All headings **500** with negative tracking.

| Role       | Size mobile→desktop | Line (desktop) | Tracking      | Use                         |
| ---------- | ------------------- | -------------- | ------------- | --------------------------- |
| xl         | 64→112              | 1.0            | -0.02em       | Giant display               |
| h1         | 32→64               | 64             | -0.03em       | Page title                  |
| h2         | 32→48               | 55.7           | -0.03→-0.01em | Hero title                  |
| h2-5       | 24→38               | 43.8           | -0.02em       | Feature title               |
| h3         | 24→30               | 39.6           | -0.01em       | Subsection                  |
| h4         | 20→22               | 27.7           | -0.01em       | **Section titles**          |
| h5 (= h6)  | 16→18               | 23.8           | -0.01em       | **Card titles**             |
| p1         | 17                  | 28             | -0.01em       | **Body** (17px is the tell) |
| p2         | 14                  | 23             | -0.01em       | Small body                  |
| meta       | 14/500              | 19.6           | 0             | Category + date rows        |
| cta        | 14/500              | 14             | 0             | Button labels               |
| caption    | 14                  | 23             | 0             | Media captions              |
| nav        | 14↔16/500           | 23             | 0             | Header nav                  |
| nav-header | 13/500              | 19.7           | 0             | Footer links and headers    |
| xs / 2xs   | 10 / 8              |                |               | Legal, chart ticks          |

## Layout

### App shell (base)

| Region        | Size                                             | Notes                                                    |
| ------------- | ------------------------------------------------ | -------------------------------------------------------- |
| Icon rail     | 52px (`--width-rail`)                            | 36px icon buttons, 10px radius, 20px filled icons        |
| Sidebar panel | 288px (`--spacing-token-sidebar` clamps 240–520) | Translucent `--gray-25` @ 65%; user-resizable; no border |
| Main pane     | fluid                                            | `--color-surface`; 0.5px hairline on its left edge       |
| Top bar       | 52px (`--height-toolbar`)                        | Temporary-chat icon button, centered mode toggle         |
| Thread column | 768px max (`--thread-content-max-width`)         | Composer and messages share this width                   |
| Composer      | 52px single-line, grows                          | Pill when single-line; 24px bottom inset in a thread     |

Spacing base 4px (`--spacing`); common steps 4, 6, 8, 10, 12, 16, 20, 24, 32. Nav rows and menu items 36px with 6×10px padding; panels pad 12px; toolbars 16px; modal 20px.

### Site grid (base)

Container max 1440px (`--max-width-container-desktop`) · page padding 24px mobile / 32px from `md` · header 64px desktop (54px base), transparent over the hero · article column 1088px (`--gutter-size: max(20px, (100vw - 68rem)/2)`) · wide media 1728px (`--media-gutter-size`) · **120px** between sections · 32px section header → grid · **24px** grid gap (1 → 2 or 4 columns) · containers sm 520 · md 704 · lg 960 · xl 1216 · 2xl 1440 · desktop nav from 1020px.

### Responsive

|         | App                                                   | Site                                           |
| ------- | ----------------------------------------------------- | ---------------------------------------------- |
| Mobile  | Sidebar becomes an overlay sheet; composer full width | 24px padding, single-column grids, mobile menu |
| Tablet  | Rail + collapsible sidebar                            | 32px padding from 768px                        |
| Desktop | Rail + 288px sidebar + 768px thread                   | Desktop nav from 1020px; 2/4-column card grids |
| Wide    | Thread stays 768px; the pane absorbs width            | Content caps at 1440px; gutters grow           |

App breakpoints are Tailwind defaults (640/768/1024/1280/1536) plus `xs` 320. Site type is fluid between 375 and 1440px.

## Elevation

**App:** flat (ground, sidebar) → hairline `0 0 0 .5px #0000001a` (dark `#ffffff1f`) → `--shadow-sm/md/lg/xl/2xl` (all ≤ 19% alpha, see tokens) → `--shadow-card` `0 4px 16px #0000000d` → `--shadow-dropdown-overlay` = hairline + xl (menus) → `--elevation-composer` `0 0 0 1px #0000000a, 0 2px 8px #0000000a, 0 4px 80px 8px #00000006` (composer, popovers, model picker). The composer's three layers (crisp 1px edge, small soft drop, very wide faint halo) are the most recognizable depth cue. **Dark: depth = lighter fills + `inset 0 0 1px #fff3` ring, never a drop shadow.**
**Site:** essentially flat. One `--drop-shadow-sm` `0 1px 2px #00000026` lifts white text over video. Separation = whitespace, media, black/white contrast.

## Shape

**App radius:** `--radius-xs` 2 (badges) · `sm` 4 (small buttons 3xs–sm) · `md` 6 (compact tooltip, section toggles) · `lg` 8 (buttons md–xl, menu items, "New chat" row) · row 10 (`--radius-token-row`: sidebar rows, rail buttons) · `xl` 12 · popover 14 · `2xl` 16 (modals, menus, suggestion rows, app window) · `3xl` 24 (large cards, form dialogs) · composer 28 (`--composer-radius`, multi-line; single-line resolves to a full pill) · `full` 9999 (composer actions, mode toggle, avatars, switch). `--corner-radius-scale` multiplies md+: 1 on web, 1.25 with `corner-shape: superellipse(1.5)` in the desktop app.
**Site radius:** `sm` 4 (text-link focus) · `md` 6.08 (**card media**) · `lg` 16 (panels) · `xl` 32 (feature panels) · pill 40 (`--button-radius`, **every CTA**) · `full` (round icon buttons). Full-bleed hero media is square.
**Icons:** filled glyphs on `currentColor`. App: 20px in rail/top bar/composer/nav rows, 18px in buttons and menu items, 16px in small controls; color follows text tier. Site: 20px icon buttons, 14px in CTAs, 12px chevrons, 8–10px arrow glyph marks external links; decorative icons at `primary-44`.

## Motion

**App:** `--transition-duration-basic` 150ms (color, opacity, state: default) · `-relaxed` 300ms (panels, layout) · `--cubic-enter` `cubic-bezier(.19,1,.22,1)` (arriving, expo-out) · `--cubic-exit` `(.8,0,.4,1)` · `--cubic-exit-snappy` `(.65,0,.4,1)` · `--cubic-move` `(.65,0,.35,1)` (position) · default `(.4,0,.2,1)`. Rail buttons transition opacity+color 150ms; suggestion rows color 75ms. `data-reduced-motion` on `<html>` mirrors the OS.
**Site:** durations fast 100ms (nav link color) · short 200ms (button color) · medium 300ms (card opacity, image zoom) · long 400ms · sidebar 640ms. Curves: `curve-a` linear `(0,0,1,1)` (color fades) · `curve-d` `(.6,0,.4,1)` (card hover opacity) · `primary` `(.17,.17,.3,1)` (overlays/dialogs 200ms, side panels 300ms) · `curve-sidebar` `(.22,1,.36,1)`. Card images scale slightly on hover over 300ms. Links dim to `primary-60` on hover rather than underlining.

## ShiftPatch screens

The rest of this file mirrors base. This section records how ShiftPatch applies it, and wins for ShiftPatch screens. The shell below stays within FR-1.8: each role has one landing screen, and every required test ID shows with no navigation. Classes live in `app/globals.css`.

| Pattern       | Spec                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign in       | Reference: login-03. `.sign-in-ground` is `--app-color-background-elevated-secondary`. A 384px column holds the mark and name, then `.sign-in-card` (`--radius-3xl`, 24px padding, hairline plus `--shadow-card`), then one line of `text-xs`. Title `heading-md`, centered. No social sign-in, sign-up or forgotten password. One solid action: Sign in, `xl`. The banner sits above the fields. |
| Section shell | Reference: dashboard-01, inset variant. `.section-shell` holds a 288px `.section-side` and an inset `.section-main` with an 8px gap and a 52px sticky `.section-top`. Rows are text only, 36px, and scroll to a section instead of changing route. The active row follows scroll. The sidebar collapses to the compact header below a 1000px container.                                           |
| Stat card     | `.surface-card` with a `text-sm` label and status badge on one row, a `heading-xl` tabular figure, and a `text-xs` caption. Two cards fill the row, above the coverage table. Admin only. No charts: reporting stops at the FR-5.3 counts.                                                                                                                                                        |

**Corners.** A pill button's radius is half its height, so an `xl` button is 20px. A card whose last row is a full-width `xl` button uses `--radius-3xl`. Radii in the shell derive from the parent: `calc(var(--outer-radius) - var(--inset))`, a 16px window and an 8px gap giving 8px rows and main pane.

**Motion.** Tokens only, in CSS. The hover highlight glides between rows at `--transition-duration-basic` with `--cubic-move`. The active marker moves at `-relaxed` with `--cubic-move`. The sign-in card, post form and banner arrive once at `-relaxed` with `--cubic-enter`. Sections rise once after sign-in with a 50ms stagger. Lists and polled data never animate. Reduced motion keeps the fades and drops the movement.

---

## App components (base)

All sizes in px. Colors name tokens; regenerate the token CSS first.

### Control size scale

One scale drives buttons, inputs and icon buttons. **36px is the workhorse**: rail icon buttons, composer buttons, top-bar buttons, nav rows, menu items and the mode toggle are all 36px tall.

| Token                      | Height  | Gutter  | Icon | Font    | Radius |
| -------------------------- | ------- | ------- | ---- | ------- | ------ |
| `control-size-4xs` / `3xs` | 20 / 22 | 6       | 14   | 12      | 4      |
| `2xs` / `xs`               | 24 / 26 | 8       | 16   | 14      | 4      |
| `sm`                       | 28      | 10      | 18   | 14      | 4      |
| `md`                       | 32      | 12      | 18   | 16      | 8      |
| `lg`                       | 36      | 12      | 18   | 14      | 8      |
| `xl`                       | 40      | 14      | 18   | 14      | 8      |
| `2xl` / `3xl`              | 44 / 48 | 14 / 16 | 20   | 14 / 16 | 12     |

### Button

`variant` × `color` (intent) × `size`. Primary action = `solid` + `primary`.

#### Tokens

| Variant | Fill                                     | Text                      | Border                                         | Hover / active                                                  |
| ------- | ---------------------------------------- | ------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| solid   | `background-{i}-solid`                   | `text-{i}-solid`          | —                                              | `-solid-hover` / `-solid-active`                                |
| soft    | `background-{i}-soft-alpha`              | `text-{i}-soft`           | status intents add `border-{i}-outline`        | `-soft-alpha-hover`                                             |
| outline | transparent                              | `text-{i}-outline`        | `inset 0 0 0 1px border-{i}-outline` (ink 15%) | fill `-outline-hover` (ink 2%), ring `border-{i}-outline-hover` |
| ghost   | transparent                              | `text-{i}-ghost`          | —                                              | fill `-ghost-hover` (ink 5%), active ink 12%                    |
| surface | `background-secondary-soft-alt` (ink 5%) | `text-secondary-soft-alt` | `border-secondary-soft-alt` (ink 6%)           | border → ink 20%                                                |

(`{i}` prefix = `--color-`.) Primary solid: `#0a2646` fill, white 14px/500 label, hover `#1b3a5e`, active `#2b4a6f`; dark `#03b4ba` fill, `#0a2646` label, hover `#35c3c8`, active `#5fd0d4`.

#### Syntax

```html
<style>
  .btn {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border: 0;
    background: none;
    font: 500 var(--btn-font, 14px)/1 var(--font-sans);
    height: var(--btn-h, 36px);
    padding: 0 var(--btn-px, 12px);
    border-radius: var(--btn-r, 8px);
    white-space: nowrap;
    transition:
      color var(--transition-duration-basic) var(--ease-basic),
      box-shadow var(--transition-duration-basic) var(--ease-basic),
      transform var(--transition-duration-basic) var(--ease-enter-snappy);
  }
  .btn::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--fill, transparent);
    clip-path: inset(0);
    transition:
      background-color var(--transition-duration-basic) var(--ease-basic),
      clip-path var(--transition-duration-basic) var(--ease-enter-snappy);
  }
  .btn svg {
    width: 18px;
    height: 18px;
  }
  .btn.icon {
    padding: 0;
    width: var(--btn-h, 36px);
  }
  .btn.pill {
    border-radius: 9999px;
  }
  .btn.solid-primary {
    --fill: var(--color-background-primary-solid);
    color: var(--color-text-primary-solid);
  }
  .btn.ghost-primary {
    color: var(--color-text-primary-ghost);
  }
  .btn.ghost-tertiary {
    color: var(--color-text-tertiary);
  }
  .btn.outline-primary {
    color: var(--color-text-primary-outline);
    box-shadow: inset 0 0 0 1px var(--color-border-primary-outline);
  }
  @media (hover: hover) and (pointer: fine) {
    .btn.solid-primary:hover {
      --fill: var(--color-background-primary-solid-hover);
    }
    .btn.ghost-primary:hover,
    .btn.ghost-tertiary:hover {
      --fill: var(--color-background-primary-ghost-hover);
    }
    .btn.ghost-tertiary:hover {
      color: var(--color-text-primary);
    }
  }
  .btn.solid-primary:active {
    --fill: var(--color-background-primary-solid-active);
  }
  .btn:not(.icon):active::before {
    clip-path: inset(1px);
    transition-duration: var(--transition-duration-basic), 80ms;
  }
  .btn.icon:active {
    transform: scale(0.97);
    transition-duration: var(--transition-duration-basic), 80ms;
  }
  .btn:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 1px;
  }
  .btn:disabled {
    opacity: 0.4;
    pointer-events: none;
  }
</style>
<button class="btn solid-primary">Continue</button>
<button class="btn ghost-primary icon pill" aria-label="Add">
  <svg viewBox="0 0 20 20" fill="currentColor">…</svg>
</button>
```

#### Rules

- Variant classes set `--fill` and `color` (outline and surface variants add an inset 1px `box-shadow` ring; ghost variants set only `color`). The fill is a `::before` layer so press can shrink it (`clip-path: inset(1px)`) while icon buttons scale to 0.97.
- Sizes set `--btn-h/--btn-px/--btn-r/--btn-font` from the control scale: 2xs 24/8/4/14, xs 26/8/4/14, sm 28/10/4/14, md 32/12/8/16, lg 36/12/8/14, xl 40/14/8/14, 2xl 44/14/12/14, 3xl 48/16/12/16.
- Labels 14px/500, 6px icon gap. Disabled 40% opacity. Focus 2px `--color-ring`, offset 1px (−1px on ghost).
- Shapes in the product: composer and top-bar actions are **full pills** (36px circles icon-only; 36px pills with 12–14px padding for labeled ones like the model picker). Rail icon buttons 36px with **10px** radius. Top-bar icon 8px radius. Standalone buttons follow the size table.
- Blue (`solid info`) is never the primary action.

### Composer (prompt box)

#### Tokens

- Body `--color-background-composer-surface` (`#fff`/`#212121`), shadow `--elevation-composer` (dark: `--elevation-composer-dark` = `inset 0 0 1px #fff3`).
- 768px wide (thread column), 52px single-line; radius 26px (half the height = pill), `--composer-radius` 28px once it grows. Padding 8px around the action row; input gutter 12px.
- Input 16px/26px `--color-text-primary`; placeholder `--color-text-tertiary` ("Ask anything").
- Leading: "+" add, 36px ghost circle, tertiary icon. Trailing: model picker pill (36px, label 16px/400 tertiary, padding `0 14px 0 12px`, chevron), dictate (36px ghost circle), then a **36px solid primary circle** `--color-background-composer-primary` / `--color-text-composer-primary` for voice/send (arrow-up when text is present).

#### Syntax

```html
<style>
  .composer {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 52px;
    padding: 8px;
    max-width: 768px;
    background: var(--color-background-composer-surface);
    border-radius: 26px;
    box-shadow: var(--elevation-composer);
  }
  .dark .composer {
    box-shadow: var(--elevation-composer-dark);
  }
  .composer.tall {
    flex-direction: column;
    align-items: flex-start;
    border-radius: var(--composer-radius);
    padding: 12px;
    gap: 10px;
  }
  .composer .input {
    flex: 1;
    padding: 0 8px;
    font: 400 16px/26px var(--font-sans);
    color: var(--color-text-primary);
  }
  .composer .input::placeholder {
    color: var(--color-text-tertiary);
  }
  .btn.send {
    --fill: var(--color-background-composer-primary);
    color: var(--color-text-composer-primary);
  }
  .sugg {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 52px;
    padding: 0 44px 0 14px;
    border-radius: 16px;
    color: var(--color-text-tertiary);
    font: 400 16px/26px var(--font-sans);
    transition: color 75ms;
  }
  @media (hover: hover) and (pointer: fine) {
    .sugg:hover {
      color: var(--color-text-primary);
      background: var(--color-background-composer-action-bar);
    }
  }
</style>
<form class="composer">
  <button class="btn ghost-tertiary icon pill" aria-label="Add">+</button>
  <input class="input" placeholder="Ask anything" />
  <button class="btn ghost-tertiary pill" style="--btn-font:16px;font-weight:400;padding:0 14px 0 12px">Model ▾</button>
  <button class="btn ghost-tertiary icon pill" aria-label="Dictate">…</button>
  <button class="btn send icon pill" aria-label="Send">↑</button>
</form>
```

#### Rules

- Empty state: centered greeting 24px/28.8px weight **400** ("What should we work on?"), 22px above the composer; suggestion rows 24px below, same 768px width, 52px tall, 16px radius, tertiary text that darkens on hover in 75ms.
- In a thread the composer sits 24px above the bottom.

### Sidebar and rail

#### Tokens

| Part            | Spec                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Rail            | 52px wide, icons only; 36px buttons, 10px radius, 20px icons; idle tertiary, selected primary; 36px avatar/profile at the bottom                                                                       |
| Panel           | 288px, `--gray-25` @ 65% over `--app-color-background-shell`; no border; 0.5px `--color-border` hairline on the main pane's left edge                                                                  |
| Primary rows    | "New chat", "Search": 36px, padding 6×10, gap 8, radius 8, 14px/20px, full primary ink                                                                                                                 |
| Section toggles | "Projects", "Recents": 14px/500 tertiary, 6px radius, 2×4 padding (label padding `14px 10px 6px`)                                                                                                      |
| History rows    | 36px, 14px/20px, ink @ 85%, single-line ellipsis, 10px radius; hover ink 5% (`--color-background-primary-ghost-hover`); active ink 8% (`--menu-item-background-color`); trailing "…" tertiary on hover |

#### Syntax

```html
<style>
  .navrow {
    display: flex;
    align-items: center;
    gap: 8px;
    height: 36px;
    padding: 0 10px;
    border-radius: 10px;
    font: 400 14px/20px var(--font-sans);
    color: color-mix(in oklab, var(--color-text-primary) 85%, transparent);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .navrow.primary {
    color: var(--color-text-primary);
    border-radius: 8px;
  }
  @media (hover: hover) and (pointer: fine) {
    .navrow:hover {
      background: var(--color-background-primary-ghost-hover);
    }
  }
  .navrow[aria-current] {
    background: var(--menu-item-background-color);
    color: var(--color-text-primary);
  }
  .navlabel {
    font: 500 14px/18px var(--font-sans);
    color: var(--color-text-tertiary);
    padding: 14px 10px 6px;
  }
  .panel {
    width: 288px;
    background: color-mix(in oklab, var(--gray-25) 65%, transparent);
  }
</style>
```

### Mode toggle (segmented "Chat / Work")

36px pill, 224px wide (two 112px segments), track `--color-background-mode-toggle-track` (ink 3%). Selected segment: `--color-background-mode-toggle-selected` (white) pill with `box-shadow: inset 0 0 0 1px var(--color-border-mode-toggle-selected), var(--shadow-mode-toggle-selected)` (`0 1px 6px #0000000d`). Labels 14px/500: selected `--color-text-mode-toggle-primary`, idle `--color-text-mode-toggle-inactive`. Centered in the 52px top bar.

Generic **segmented control**: track `--segmented-control-background` (`#ededed`), 2px gutter/gap, pill; options padding 4×14, 13px/20px at weight 600, secondary → primary when selected; white thumb `--segmented-control-thumb-background` with `0 1px 4px -1px #0003`, moved by transform+width with `basic var(--cubic-move)` (no animation on first placement; off under reduced motion).

### Menus and popovers

#### Tokens

Panel `--color-surface-elevated`, 16px radius, `--shadow-dropdown-overlay` (hairline + xl; dark: inner light ring + xl), min-width 240px, 6–10px gutter (`--app-menu-gutter`). Item 36px, padding 6×10, gap 6, radius 8 (16 − 8 gutter), 14px/20px, 18px icons; hover `--menu-item-background-color` (ink 8% light, 10% dark). Separator 1px `--color-border`, 4–8px vertical gutter. Danger item `--color-text-danger`. Submenu chevron tertiary, right-aligned. Model picker uses the same panel with `--model-picker-overlay-shadow`; dark background `#303030`.

#### Syntax

```html
<div
  role="menu"
  style="width:240px;padding:6px;border-radius:16px;background:var(--color-surface-elevated);box-shadow:var(--shadow-dropdown-overlay)"
>
  <div role="menuitem" class="mi">Rename</div>
  <div role="menuitem" class="mi">Move to project <span style="margin-left:auto">›</span></div>
  <div role="separator" style="height:1px;background:var(--color-border);margin:4px 0"></div>
  <div role="menuitem" class="mi" style="color:var(--color-text-danger)">Delete</div>
</div>
<style>
  .mi {
    display: flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 6px 10px;
    border-radius: 8px;
    font: 400 14px/20px var(--font-sans);
  }
  @media (hover: hover) and (pointer: fine) {
    .mi:hover {
      background: var(--menu-item-background-color);
    }
  }
</style>
```

### Tooltip

- **Compact** (default for icon buttons): bg `--tooltip-compact-background-color` (`#0d0d0d`, white in dark), text `--tooltip-compact-text-color`, 12px/16px weight 600, padding 4×8, radius 6, gap 6; a shortcut hint ("Ctrl K") at weight 400, opacity .6.
- **Rich**: bg `--tooltip-background-color` (`#fff`/`#212121`), text `--tooltip-text-color`, 14px/1.45, padding 8×12 / 12×16 / 14×18 (sm/md/lg), radius 6, max-width ~260px, shadow `--tooltip-box-shadow` (`0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a` + 0.5px hairline); title in 600.

### Modal

Dialog: `--modal-radius` 16px, `--modal-container-inner-padding` 20px, surface `--color-surface-elevated`, shadow `--shadow-2xl`, ~380px wide for confirms. Backdrop `--modal-backdrop-background`: black 30% light, 50% dark. Title 18px/26px 600 (6px below), body 14px/20px secondary (20px below), actions right-aligned with 8px gap as pills: `outline-primary` Cancel + `solid-danger` Delete. Form dialogs use 24px radius.

### Switch, radio, badge

| Control      | Spec                                                                                                                                                                                                                                                                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Switch       | `role="switch"`, track 32×19 (`--switch-track-width/height`), pill; off `--switch-track-color` (ink 10%), on `--switch-track-color-checked` `#3a83f7`; thumb 13px (`--switch-thumb-size`) white, 3px inset, `0 1px 2px #0003`, moves with `transform basic var(--cubic-move)`; disabled track `#ededed`; label gap 8; focus 2px ring offset 1 |
| Radio        | 16px indicator, `inset 0 0 0 1px` `--color-border-strong`; checked fill `#0a2646`/`#03b4ba` with a 6px `#fff`/`#0a2646` hole; label 14px/20px, 6px gap; rows 20px apart                                                                                                                                                                       |
| Badge        | heights 20/22/24 (sm/md/lg), font 12/14/14 at 600, radius 2/2/4, padding 5/6/8; colors = intent `soft` (bg `-soft-alpha`, text `-soft`) or `solid`; sm tracking 0.025em                                                                                                                                                                       |
| Unread count | min 18×18, padding 0 5, radius 4, bg `--color-background-info-solid`, `#fff` 11px/1 at 590, tracking -0.15px                                                                                                                                                                                                                                  |

### Messages

| Part         | Spec                                                                                                                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| User bubble  | Right-aligned, max-width 70%, padding 10×16, radius 20, `--color-background-user-message` (solid ink on the web build, `rgb(50 50 50 / 85%)` dark), `--color-text-user-message` white, 16px/24px, tracking -0.01em                         |
| Assistant    | No bubble. Markdown on the surface, 16px/1.625, paragraphs 12px apart; block spacing in font-size/4 multiples                                                                                                                              |
| Code block   | `--font-mono` 12–14px (13px/1.6), padding 14×16, radius 12, bg `--color-surface-tertiary` at 92%, `inset 0 0 0 1px --color-border-subtle`                                                                                                  |
| Actions row  | gap 10, tertiary 18px icons (copy, more)                                                                                                                                                                                                   |
| Loading text | Shimmer: `background: linear-gradient(90deg, tertiary@55% 0%, text-primary 50%, tertiary@55% 100%)`, `background-size:200% 100%`, `background-clip:text`, 2s linear infinite sweep; reduced motion → secondary color pulsing to opacity .5 |

Thread container: max-width 768px centered, 12px between messages.

---

## Site components (base)

### Button (pill CTA)

All CTAs share one shape.

#### Tokens

Height `--button-height` 40px (`--button-height-sm` 36px in the header), radius `--button-radius` 40px, padding `0 var(--button-padding-x)` (20px), label `--type-cta-*` (14px/500, line-height 1), 0.3em icon gap, 14px icons; color transition 200ms linear (`--transition-duration-short` + `curve-a`). Focus: `outline: 2px solid currentColor; outline-offset: 2px`.

| Variant     | Fill                               | Text                            | Hover                          | Where                       |
| ----------- | ---------------------------------- | ------------------------------- | ------------------------------ | --------------------------- |
| primary     | `--color-cta-fill` (navy/teal)     | `--color-cta-text` (white/navy) | `--color-cta-hover`            | "Try it" in header          |
| secondary   | `--color-primary-4`                | `--color-primary-100`           | `primary-12`                   | "Log in", "Download"        |
| media-solid | `#fff`                             | `#000`                          | white 80%                      | Hero CTA over video         |
| media-glass | `--color-secondary-12` (white 12%) | `#fff`                          | white 4% (fades)               | Secondary action over video |
| text        | none (padding 0 2px, radius 4)     | `primary-100`                   | `primary-60`                   | "View more", "View all"     |
| icon button | none, 40px circle                  | `primary-60`                    | `primary-100` + bg `primary-4` | Search                      |

Dark mode flips the ladders, so secondary fills use white 4–12%. The primary CTA uses `--color-cta-*`, which is teal with a navy label in dark.

#### Syntax

```html
<style>
  .cta {
    position: relative;
    isolation: isolate;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3em;
    height: var(--button-height);
    padding: 0 var(--button-padding-x);
    border-radius: var(--button-radius);
    font: var(--type-cta-weight) var(--type-cta-size)/1 var(--font-sans);
    white-space: nowrap;
    text-decoration: none;
    transition: color var(--transition-duration-short) var(--transition-timing-function-curve-a);
  }
  .cta::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    background: var(--fill, transparent);
    clip-path: inset(0);
    transition:
      background-color var(--transition-duration-short) var(--transition-timing-function-curve-a),
      clip-path var(--transition-duration-short) var(--ease-out);
  }
  .cta.sm {
    height: var(--button-height-sm);
  }
  .cta.primary {
    --fill: var(--color-cta-fill);
    color: var(--color-cta-text);
  }
  .cta.secondary {
    --fill: var(--color-primary-4);
    color: var(--color-primary-100);
  }
  .cta.text {
    padding: 0 2px;
    border-radius: var(--radius-sm);
    color: var(--color-primary-100);
  }
  @media (hover: hover) and (pointer: fine) {
    .cta.primary:hover {
      --fill: var(--color-cta-hover);
    }
    .cta.secondary:hover {
      --fill: var(--color-primary-12);
    }
    .cta.text:hover {
      color: var(--color-primary-60);
    }
  }
  .cta:not(.text):active::before {
    clip-path: inset(1px);
    transition-duration: var(--transition-duration-short), var(--transition-duration-fast);
  }
  .cta:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
  .iconbtn {
    width: 40px;
    height: 40px;
    border-radius: 9999px;
    color: var(--color-primary-60);
  }
</style>
<a class="cta primary" href="#">Get started ↗</a>
<a class="cta secondary" href="#">Download</a>
<a class="cta text" href="#">View all</a>
```

### Header

64px tall, transparent, centered in the 1440px container with 24/32px padding. Wordmark left; nav links in the middle (`--type-nav-*`, 14–16px/500, `primary-100`, 100ms color fade, ~22px apart, each with a 12px chevron button that opens a mega-menu); right cluster (8px gap): round search icon button, secondary "Log in" pill (36px), primary pill (36px). Over media, links are white and CTAs use the media variants.

### Hero

Full-bleed video or image, **square corners**. Centered stack: `type-h2` title (48px desktop, 500, -0.03em) in white; `type-p1` paragraph max 430px wide in white with `drop-shadow(0 1px 2px #00000026)`, 8px below the title; then a white `media-solid` pill CTA 24px below. A glass "Close" pill sits top-right on dismissible banners.

### Section

```
[ h4 section title ]                           [ View all  (text link) ]
                    32px
[ card ] [ card ] [ card ] [ card ]     <- grid, 24px gap
                    120px to the next section
```

Title `type-h4` (22px desktop, 500, -0.01em); header row is flex, `align-items: baseline`, space-between.

```html
<div class="max-w-container-2xl mx-auto mb-8 flex items-baseline justify-between px-6 md:px-8">
  <h2 class="text-h4">Recent updates</h2>
  <a class="text-cta hover:text-primary-60 ease-curve-a transition-colors duration-200" href="#">View all</a>
</div>
```

### Cards

| Card           | Layout                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature (4-up) | 1:1 media, 6px radius (`--radius-md`); 16px gap; `type-h5` title (18px/500); then a `type-meta` row: category in `primary-100`, read time or date in `primary-60`, 12px apart (gap `8px 12px`, wraps) |
| List (2-up)    | Square thumbnail (185px desktop) left, text right with 32px start padding (64px end at `xl`): `type-h5` title, 16px gap, meta row                                                                     |
| Story (3-up)   | Larger square media (~440px), title and date below                                                                                                                                                    |

#### Rules

- The whole card is the link (an `::after` overlay covers it). No borders, shadows or backgrounds: the media carries the shape.
- Hover: image `scale(1.02)` over 300ms (`--transition-duration-medium`, only with `prefers-reduced-motion: no-preference`) and the title dims to opacity .6 via a 300ms `curve-d` transition.
- Grids: 4 → 2 columns and 2 → 1 on narrow screens; gap 24px.
- Placeholder art: two radial gradients from `--color-brand-{A}-200` and `--color-brand-{B}-300` over `--color-brand-gray-75` (pairs blue/teal, purple/pink, yellow/orange, green/teal) so tints stay tints in dark.

### Footer

Starts 120px below the last section; `border-top: 1px solid var(--color-primary-12)`, 32px top padding. Five link columns, 24px gap. Headers and links both use `type-nav-header` (13px/500, 19.68px line); headers in `primary-60`, 12px above the list; links `primary-100`, 10px apart, dim to `primary-60` on hover (200ms curve-a); external links carry an 8px arrow glyph. Bottom row (48px below): mark, copyright, locale selector with chevron, all 13px. Hierarchy comes from position and the hover dim, not size.

### Prose (articles)

Body runs in the 1088px gutter column at `type-p1` (17px/28px, -0.01em). Headings use the medium-weight fluid scale. Inline code and blocks use `--font-mono` with the syntax palette; diffs use `--color-diff-*`. Code frames: 14px/1.6 mono on `--color-primary-solid-4`.

---

## Tailwind bridge

Values stay in the token CSS; the bridge only maps names to utilities with `@theme inline reference` (utilities inline the `var()` call and Tailwind does not re-emit the names into `:root`, which avoids self-referencing cycles like `--font-sans: var(--font-sans)` and lets `.dark` overrides win). Both bridges register:

```css
@custom-variant dark (&:where(.dark, .dark *, [data-theme="dark"], [data-theme="dark"] *));
```

### app.theme.css

```css
@theme inline reference {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-brand: var(--font-base-sans);
  /* surfaces */
  --color-surface: var(--color-surface);
  --color-surface-tertiary: var(--color-surface-tertiary);
  --color-shell: var(--app-color-background-shell);
  --color-elevated: var(--color-surface-elevated);
  --color-elevated-secondary: var(--app-color-background-elevated-secondary);
  --color-card: var(--color-surface-card);
  --color-composer: var(--color-background-composer-surface);
  --color-control: var(--color-background-control-opaque);
  --color-user-message: var(--color-background-user-message);
  /* text: --color-X: var(--color-text-X) for primary secondary tertiary disabled inverse danger success warning caution info discovery */
  --color-accent: var(--app-color-text-accent);
  /* borders */
  --color-default: var(--color-border);
  --color-strong: var(--color-border-strong);
  --color-subtle: var(--color-border-subtle);
  --color-ring: var(--color-ring);
  /* intent fills */
  --color-primary-solid: var(--color-background-primary-solid);
  --color-primary-solid-hover: var(--color-background-primary-solid-hover);
  --color-primary-solid-active: var(--color-background-primary-solid-active);
  --color-on-primary-solid: var(--color-text-primary-solid);
  --color-secondary-solid: var(--color-background-secondary-solid);
  --color-ghost-hover: var(--color-background-primary-ghost-hover);
  --color-ghost-active: var(--color-background-primary-ghost-active);
  /* for X in danger success warning caution info discovery: */
  --color-X-solid: var(--color-background-X-solid);
  --color-X-soft: var(--color-background-X-soft-alpha);
  /* text sizes (web build) */
  --text-xs: 12px;
  --text-xs--line-height: 18px;
  --text-sm: 14px;
  --text-sm--line-height: 20px;
  --text-base: 16px;
  --text-base--line-height: 24px;
  --text-lg: 18px;
  --text-lg--line-height: 29px;
  --text-xl: 20px;
  --text-2xl: 24px;
  --text-3xl: 30px;
  --text-4xl: 36px;
  /* radius: --radius-K: var(--radius-K) for xs sm md lg xl 2xl 3xl 4xl */
  /* shadows: --shadow-K: var(--shadow-K) for sm md lg xl 2xl hairline */
  --shadow-composer: var(--elevation-composer);
  --shadow-dropdown: var(--shadow-dropdown-overlay);
  --ease-enter: var(--cubic-enter);
  --ease-exit: var(--cubic-exit);
  --ease-move: var(--cubic-move);
}
```

(Expand the `X`/`K` comment lines into one declaration per name.)

### site.theme.css

```css
@theme inline reference {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-lf: var(--font-lf);
  --color-background: var(--color-background);
  /* same-name maps: --color-primary-{2,4,12,44,60,80,100}, --color-secondary-{4,12,60,100}, --color-tertiary-100 */
  --color-cta-fill: var(--color-cta-fill);
  --color-cta-hover: var(--color-cta-hover);
  --color-cta-text: var(--color-cta-text);
  --color-scrim: var(--color-scrim-dark);
  /* fluid type, for S in xl h1 h2 h3 h4 h5: */
  --text-S: var(--type-S-size);
  --text-S--line-height: var(--type-S-line);
  --text-S--letter-spacing: var(--type-S-track);
  --text-S--font-weight: var(--type-S-weight);
  /* p1, p2: size + line-height + letter-spacing; meta, cta, nav-header: size + line-height + font-weight; caption: size + line-height */
  /* radius: --radius-{sm,md,lg,xl}: same-name */
  --radius-pill: var(--button-radius);
  /* containers: --container-{sm,md,lg,xl,2xl}: same-name */
  --ease-primary: var(--transition-timing-function-primary);
  --ease-curve-a: var(--transition-timing-function-curve-a);
  --ease-curve-d: var(--transition-timing-function-curve-d);
  --ease-sidebar: var(--transition-timing-function-curve-sidebar);
}
```

### Utilities

- **App:** `bg-surface`, `bg-shell`, `bg-elevated`, `bg-card`, `bg-composer` · `text-primary/-secondary/-tertiary` · `border-default/-strong/-subtle` (10/15/5% ink) · `bg-primary-solid hover:bg-primary-solid-hover text-on-primary-solid` (primary button) · `hover:bg-ghost-hover active:bg-ghost-active` (ghost button/row) · `bg-danger-soft text-danger` (and success, warning, caution, info, discovery) · `rounded-lg` (8), `rounded-2xl` (16), `rounded-full` · `shadow-composer`, `shadow-dropdown`, `shadow-hairline` · `ease-enter/-exit/-move` · `font-brand`.
- **Site:** `bg-background`, `text-primary-100` · `text-primary-60` (meta), `text-primary-44` (decorative) · `bg-cta-fill hover:bg-cta-hover text-cta-text` (primary pill) · `bg-primary-4 hover:bg-primary-12` (secondary pill) · `bg-secondary-12 text-secondary-100` (glass pill on media) · `text-xl`, `text-h1`…`text-h5` (size, leading, tracking, weight together) · `text-p1/-p2/-meta/-cta/-caption/-nav-header` · `rounded-pill` (40), `rounded-md` (6) · `max-w-container-2xl` · `ease-curve-a duration-200` (link/button fade) · `ease-primary` (overlays).

```html
<button
  class="h-9 rounded-lg bg-primary-solid px-3 text-sm font-medium text-on-primary-solid transition-colors duration-150 hover:bg-primary-solid-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-40"
>
  Continue
</button>
```

### Rules

- Prefer the semantic utilities to palette classes or raw hex.
- A utility with no token behind it is drift: add the token (both themes) first, then map it.
- Check the generated CSS once after setup; a missing utility usually means the bridge name and token name diverged.

---

## Fonts and brand

| System | Family                         | Weights           | Job                    | License    |
| ------ | ------------------------------ | ----------------- | ---------------------- | ---------- |
| app    | System UI stack                | 400, 500, 600     | All product UI         | Free (OS)  |
| app    | ui-monospace / SF Mono / Menlo | 400               | Code                   | Free (OS)  |
| app    | Inter Variable                 | 400–600           | Brand moments only     | Free (OFL) |
| site   | Inter Variable                 | 300–700 + italics | Everything             | Free (OFL) |
| site   | LF Serif                       | 400–700 + italic  | Rare editorial accents | Commercial |
| site   | SF Mono / Consolas             | 400               | Code                   | Free (OS)  |

- The app needs **no web fonts**: San Francisco on Apple, Segoe UI on Windows. That is part of the feel.
- Brand sans is **Inter Variable** (`npm i @fontsource-variable/inter` then `@import "@fontsource-variable/inter";`, no Google Fonts link needed). Alternatives: Geist (more geometric, good for big site headlines), or the system stack. Whatever the face, keep weight 500 headings and the negative tracking from `--type-*`; they carry more of the look than the face. Keep `liga` + `calt` on. LF Serif falls back to `"Source Serif 4", Georgia, serif`.
- Brand usage at the source (reference only): app logo at the top of the sidebar as a home link, always `currentColor`, animates as the loading indicator (`--loading-blossom-delay: 1s`); app chrome has almost no imagery. Site logo header-left, monochrome `primary-100`, flips with theme; large square-cornered hero media; 1:1 art cards with 6px radius; illustration = soft gradients from the brand ramps and `--color-hue-*`.
- Building your own mark: monochrome first (single `currentColor` fill that works at 20px and ~24–28px header height); no brand hue in UI chrome beyond the primary action; wordmark in the UI face at 500–600 with tight tracking (-0.01 to -0.02em); favicon = mark alone, ink on transparent, with a light variant for dark tabs. Use a neutral placeholder (e.g. a ring + "Acme") in demos.

## Provenance and caveats

- Captured 2026-10-01 at a 1760×1026 CSS px viewport. App: signed-in home, web build `d92c92cf`. Site: homepage, Next.js build of that date. Light was live; dark was computed via a hidden probe carrying `[data-theme="dark"]` (app) or `.dark` (site).
- Method: walked every same-origin stylesheet (including `@layer`, `@media`, `@supports`) to collect custom properties; resolved each with `getComputedStyle` on `<html>` and on the dark probe; measured components with `getBoundingClientRect`; curated into semantic groups and resolved simple `calc()` chains. App ≈2,300 properties found, 745 kept (234 with dark overrides). Site ≈850 global properties found (chart, embed and campaign scopes skipped), 498 kept (183 dark overrides).
- **Measured** from rendered elements: sidebar 288, rail 52, composer 768×52 with 26px radius, 36px controls, 65% sidebar translucency, 0.5px pane hairline, site header 64, 120px section gap, 24px grid gap, 6.08px media radius, 40px CTA pills, 17px body. **Declared only** (not visible on the captured screens): full intent matrix, modal, tooltip, switch, radio, badge, segmented control, headings above 24px, chart ramps, syntax colors.
- Live products change; re-measure before relying on a pixel value for parity. Probe-derived dark values may differ for a few browser-shell-only app tokens. Not captured: other marketing pages, the API platform/docs UI, mobile apps, motion keyframes (site `--animate-*` reference `content-show`, `fade-in`, `fade-out`, `slide-in-end`, `slide-out-end`, which you must define).
- Known quirks kept from the source: `--color-text-info-solid` is `rgb(0, 0, 0)`; dark `--gray-850/950/975` don't mirror exactly; site dark `brand-green-100` / `brand-orange-100` and `brand-gray-50` break the mirror rule; brand `-400` and chart `-60` steps have no dark override.
- To refresh: open both sites, repeat the method in DevTools or a Playwright script, and diff against the Token reference below.

---

## Token reference

Complete and lossless. Format: `--name: light | dark` (no `|` → same value in both themes). `--prefix-*: k=v; …` expands to `--prefix-k: v`. `#hex/N%` = `color-mix(in oklab, #hex N%, transparent)`. `fluid(A→B)` = linear `clamp()` between 375px and 1440px viewports (see Install). Light selector `:root`, dark selector `.dark, [data-theme="dark"]`.

### app tokens (tokens/app.css · base · 745 tokens, 234 with dark values)

```css
// Primitive · gray ramp (inverts in dark: step N swaps with its mirror)
--gray-*: 0=#fff | #0d0d0d; 25=#fcfcfc | #101010; 50=#f9f9f9 | #131313; 75=#f3f3f3 | #161616; 100=#ededed | #181818; 150=#dfdfdf | #1c1c1c; 200=#cdcdcd | #212121; 250=#b9b9b9 | #282828; 300=#afafaf | #303030; 350=#9f9f9f | #393939; 400=#8f8f8f | #414141; 450=#767676 | #4f4f4f; 500=#5d5d5d; 550=#4f4f4f | #767676; 600=#414141 | #8f8f8f; 650=#393939 | #9f9f9f; 700=#303030 | #afafaf; 750=#282828 | #b9b9b9; 800=#212121 | #cdcdcd; 850=#1c1c1c | #dcdcdc; 900=#181818 | #ededed; 925=#161616 | #f3f3f3; 950=#131313 | #f3f3f3; 975=#101010 | #f9f9f9; 1000=#0d0d0d | #fff

// Primitive · ink alpha ramp (ink color at N% — borders, hovers, tracks)
--alpha-*: 0=#0d0d0d/0% | #ededed/0%; 01=#0d0d0d/1% | #ededed/1%; 02=#0d0d0d/2% | #ededed/2%; 04=#0d0d0d/4% | #ededed/4%; 05=#0d0d0d/5% | #ededed/5%; 06=#0d0d0d/6% | #ededed/6%; 08=#0d0d0d/8% | #ededed/8%; 10=#0d0d0d/10% | #ededed/10%; 12=#0d0d0d/12% | #ededed/12%; 15=#0d0d0d/15% | #ededed/15%; 16=#0d0d0d/16% | #ededed/16%; 20=#0d0d0d/20% | #ededed/20%; 25=#0d0d0d/25% | #ededed/25%; 30=#0d0d0d/30% | #ededed/30%; 35=#0d0d0d/35% | #ededed/35%; 40=#0d0d0d/40% | #ededed/40%; 50=#0d0d0d/50% | #ededed/50%; 60=#0d0d0d/60% | #ededed/60%; 70=#0d0d0d/70% | #ededed/70%; base=#0d0d0d | #ededed

// Primitive · hue ramps (constant across themes)
--blue-*: 25=#f5faff; 50=#e5f3ff; 75=#cce6ff; 100=#99ceff; 200=#66b5ff; 300=#339cff; 400=#0285ff; 500=#0169cc; 600=#004f99; 700=#003f7a; 800=#013566; 900=#00284d; 950=#000e1a; 1000=#000d19
--green-*: 25=#edfaf2; 50=#d9f4e4; 75=#b8ebcc; 100=#8cdfad; 200=#66d492; 300=#40c977; 400=#04b84c; 500=#00a240; 600=#008635; 700=#00692a; 800=#004f1f; 900=#003716; 950=#011c0b; 1000=#001207
--orange-*: 25=#fff5f0; 50=#ffe7d9; 75=#ffcfb4; 100=#ffb790; 200=#ff9e6c; 300=#ff8549; 400=#fb6a22; 500=#e25507; 600=#b9480d; 700=#923b0f; 800=#6d2e0f; 900=#4a2206; 950=#281105; 1000=#211107
--pink-*: 25=#fff4f9; 50=#ffe8f3; 75=#ffd4e8; 100=#ffbada; 200=#ffa3ce; 300=#ff8cc1; 400=#ff66ad; 500=#e04c91; 600=#ba437a; 700=#963c67; 800=#6e2c4a; 900=#4d1f34; 950=#29101c; 1000=#1a0a11
--purple-*: 25=#f9f5fe; 50=#efe5fe; 75=#e0cefd; 100=#ceb0fb; 200=#be95fa; 300=#ad7bf9; 400=#924ff7; 500=#8046d9; 600=#6b3ab4; 700=#532d8d; 800=#3f226a; 900=#2c184a; 950=#160c25; 1000=#100a19
--red-*: 25=#fff0f0; 50=#ffd9d9; 75=#ffc6c5; 100=#ffa4a2; 200=#ff8583; 300=#ff6764; 400=#fa423e; 500=#e02e2a; 600=#ba2623; 700=#911e1b; 800=#6e1615; 900=#4d100e; 950=#280b0a; 1000=#1f0909
--yellow-*: 25=#fffbed; 50=#fff6d9; 75=#ffeeb8; 100=#ffe48c; 200=#ffdb66; 300=#ffd240; 400=#ffc300; 500=#e0ac00; 600=#ba8e00; 700=#916f00; 800=#6e5400; 900=#4d3b00; 950=#261d00; 1000=#1a1400

// Primitive · hue alpha ramps
--blue-*: a25=#0285ff/4%; a50=#0285ff/13%; a75=#0285ff/25%; a100=#0285ff/40%; a200=#0285ff/60%; a300=#0285ff/80%
--green-*: a25=#04b84c/8%; a50=#04b84c/15%; a75=#04b84c/29%; a100=#04b84c/45%; a200=#04b84c/60%; a300=#04b84c/75%
--orange-*: a25=#fb6a22/7%; a50=#fb6a22/16%; a75=#fb6a22/33%; a100=#fb6a22/48%; a200=#fb6a22/65%; a300=#fb6a22/81%
--pink-*: a25=#ff66ad/8%; a50=#ff66ad/16%; a75=#ff66ad/28%; a100=#ff66ad/45%; a200=#ff66ad/60%; a300=#ff66ad/76%
--purple-*: a25=#924ff7/6%; a50=#924ff7/15%; a75=#924ff7/28%; a100=#924ff7/45%; a200=#924ff7/60%; a300=#924ff7/75%
--red-*: a25=#fa423e/8%; a50=#fa423e/16%; a75=#fa423e/30%; a100=#fa423e/48%; a200=#fa423e/64%; a300=#fa423e/79%
--yellow-*: a25=#ffc300/8%; a50=#ffc300/15%; a75=#ffc300/27%; a100=#ffc300/45%; a200=#ffc300/59%; a300=#ffc300/74%

// Surfaces
--app-color-background-card: #ffffff | #212121
--app-color-background-editor-opaque: #f9f9f9 | #212121
--app-color-background-elevated-primary: #ffffff | #212121
--app-color-background-elevated-primary-opaque: #ffffff | #1b1b1b
--app-color-background-elevated-secondary: #f3f3f3 | #303030
--app-color-background-shell: #f9f9f9 | #000000
--app-color-background-surface: #fcfcfc | #0e0e0e
--app-color-background-surface-under: #fcfcfc | #0e0e0e
--color-background-callout-surface: #f3f3f3 | #414141
--color-background-composer-action-bar: #f3f3f3 | #1b1b1b
--color-background-composer-surface: #ffffff | #212121
--color-background-control-opaque: #ffffff | #303030
--color-surface: #fcfcfc | #0e0e0e
--color-surface-*: canvas=color-mix(in srgb, #fcfcfc 98%, #000) | color-mix(in srgb, #0e0e0e 98%, #000); card=#ffffff | #212121; elevated=#ffffff | #212121
--color-surface-elevated-secondary: #ffffff | #212121
--color-surface-*: recovery=#f8f7f5; secondary=#fcfcfc | #0e0e0e; tertiary=#f9f9f9 | #212121

// Text
--color-text-*: caution=#ffc300 | #ffd240; danger=#e02e2a | #ff6764; disabled=#8f8f8f | #afafaf; discovery=#924ff7 | #ad7bf9; info=#2c67c5 | #63a8f8; inverse=#ffffff | #0d0d0d; primary=#0d0d0d | #ededed; secondary=#5d5d5d | #cdcdcd; success=#00a240 | #40c977; tertiary=#8f8f8f | #afafaf; warning=#e25507 | #ff8549

// Icons & accent
--app-color-accent-*: blue=#3a83f7; green=#00a240 | #40c977; orange=#e25507 | #fb6a22; purple=#924ff7 | #ad7bf9; red=#e02e2a | #ff6764; yellow=#ffc300 | #ffd240
--app-color-icon-*: accent=#2c67c5 | #63a8f8; error=#e02e2a | #ff6764; primary=#0d0d0d | #ededed; secondary=#5d5d5d | #cdcdcd; success=#00a240 | #40c977; tertiary=#8f8f8f | #afafaf; warning=#e25507 | #ff8549
--app-color-text-accent: #2c67c5 | #63a8f8

// Borders, hairlines & focus
--app-color-border-*: error=#e02e2a/15% | #fa423e/40%; focus=#3a83f7; heavy=#00000026 | #ffffff33; light=#0000000d | #ffffff0d; warning=#e25507/15% | #ff8549/40%
--app-shell-sidebar-divider: #0000001a | #ededed/10%
--color-border: #0000001a | #ffffff26
--color-border-*: disabled=#0d0d0d/6% | #ededed/6%; overlay=#0000001a | #ffffff33; strong=#00000026 | #ffffff33; subtle=#0000000d | #ffffff0d
--color-ring: #3a83f7

// Intent matrix · backgrounds (solid / soft / soft-alpha / outline / ghost / surface)
--color-background-caution-*: ghost-active=#ffc300/15%; ghost-hover=#ffc300/15%; outline-active=#ffc300/8%; outline-hover=#ffc300/8%; soft=#fff6d9; soft-active=#ffeeb8; soft-alpha=#ffc300/15%; soft-alpha-active=#ffc300/27%; soft-alpha-hover=#ffc300/27%; soft-hover=#ffeeb8; solid=#ffc300 | #ffd240; solid-active=#916f00; solid-hover=#916f00; surface=#ffc300/8% | #ffc300/15%
--color-background-danger-*: ghost-active=#fa423e/16%; ghost-hover=#fa423e/16%; outline-active=#fa423e/8%; outline-hover=#fa423e/8%; soft=#ffd9d9; soft-active=#ffc6c5; soft-alpha=#fa423e/16%; soft-alpha-active=#fa423e/30%; soft-alpha-hover=#fa423e/30%; soft-hover=#ffc6c5; solid=#e02e2a; solid-active=#e02e2a; solid-hover=#e02e2a; surface=#fff0f0 | #280b0a
--color-background-discovery-*: ghost-active=#924ff7/15%; ghost-hover=#924ff7/15%; outline-active=#924ff7/6%; outline-hover=#924ff7/6%; soft=#efe5fe; soft-active=#e0cefd; soft-alpha=#924ff7/15%; soft-alpha-active=#924ff7/28%; soft-alpha-hover=#924ff7/28%; soft-hover=#e0cefd; solid=#924ff7 | #ad7bf9; solid-active=#8046d9; solid-hover=#8046d9; surface=#924ff7/6% | #924ff7/15%
--color-background-info-*: ghost-active=#0285ff/13%; ghost-hover=#0285ff/13%; outline-active=#0285ff/4%; outline-hover=#0285ff/4%; soft=color-mix(in srgb, #2c67c5 30%, transparent); soft-active=#cce6ff; soft-alpha=#0285ff/13%; soft-alpha-active=#0285ff/25%; soft-alpha-hover=#0285ff/25%; soft-hover=#cce6ff; solid=#3a83f7; solid-active=#0169cc; solid-hover=#0169cc; surface=#e8f3fe | #133463
--color-background-primary-*: ghost-active=#0d0d0d/12% | #ededed/16%; ghost-focus=#0d0d0d/12% | #ffffff1a; ghost-hover=#0000000d | #ffffff1a; outline-active=#0d0d0d/4% | #ededed/6%; outline-hover=#0d0d0d/2% | #ededed/4%; soft=#ffffff | #303030; soft-active=#f3f3f3 | #303030; soft-alpha=#f3f3f3 | #303030; soft-alpha-active=#0d0d0d/16% | #ededed/20%; soft-alpha-hover=#0d0d0d/12% | #ededed/16%; soft-alt=#0d0d0d/5% | #ededed/5%; soft-hover=#0000000d | #ffffff1a; solid=#0a2646 | #03b4ba; solid-active=#2b4a6f | #5fd0d4; solid-hover=#1b3a5e | #35c3c8; surface=#0d0d0d/5% | #ededed/8%
--color-background-secondary-*: ghost-active=#0d0d0d/12% | #ededed/16%; ghost-hover=#0000000d | #ffffff1a; outline-active=#0d0d0d/4% | #ededed/6%; outline-hover=#0d0d0d/2% | #ededed/4%; soft=#f3f3f3 | #303030; soft-active=#f3f3f3 | #303030; soft-alpha=#0000000d | #ffffff1a; soft-alpha-active=#0d0d0d/16% | #ededed/20%; soft-alpha-hover=#0d0d0d/12% | #ededed/16%; soft-alt=#0d0d0d/5% | #ededed/5%; soft-hover=#0000000d | #ffffff1a; solid=#f3f3f3 | #303030; solid-active=#f3f3f3 | #303030; solid-hover=#0000000d | #ffffff1a
--color-background-success-*: ghost-active=#04b84c/15%; ghost-hover=#04b84c/15%; indicator=#008635 | #00a240; outline-active=#04b84c/8%; outline-hover=#04b84c/8%; soft=#d9f4e4; soft-active=#b8ebcc; soft-alpha=#04b84c/15%; soft-alpha-active=#04b84c/29%; soft-alpha-hover=#04b84c/29%; soft-hover=#b8ebcc; solid=#008635; solid-active=#00a240 | #008635; solid-hover=#00a240 | #008635; surface=#edfaf2 | #011c0b
--color-background-warning-*: ghost-active=#fb6a22/16%; ghost-hover=#fb6a22/16%; outline-active=#fb6a22/7%; outline-hover=#fb6a22/7%; soft=#ffe7d9; soft-active=#ffcfb4; soft-alpha=#fb6a22/16%; soft-alpha-active=#fb6a22/33%; soft-alpha-hover=#fb6a22/33%; soft-hover=#ffcfb4; solid=#e25507 | #fb6a22; solid-active=#b9480d; solid-hover=#b9480d; surface=#fff5f0 | #281105

// Intent matrix · text
--color-text-caution-*: ghost=#916f00; ghost-hover=#916f00; outline=#916f00; outline-hover=#916f00; soft=#6e5400 | #ffc300; solid=#fff; surface=#6e5400 | #ffc300
--color-text-danger-*: ghost=#e02e2a | #fa423e; ghost-hover=#e02e2a | #fa423e; outline=#fa423e | #ff6764; outline-hover=#fa423e | #e02e2a; soft=#e02e2a | #ff6764; solid=#fff; surface=#ba2623 | #fa423e
--color-text-discovery-*: ghost=#8046d9; ghost-hover=#8046d9; outline=#924ff7 | #be95fa; outline-hover=#924ff7 | #be95fa; soft=#6b3ab4 | #be95fa; solid=#fff; surface=#6b3ab4 | #be95fa
--color-text-info-*: ghost=#0169cc | #66b5ff; ghost-hover=#0169cc | #66b5ff; outline=#0285ff | #66b5ff; outline-hover=#0285ff | #66b5ff; soft=#3a83f7; solid=rgb(0, 0, 0); surface=#004f99 | #339cff
--color-text-primary-*: ghost=#0d0d0d | #ededed; ghost-hover=#0d0d0d | #ededed; outline=#0d0d0d | #ededed; outline-hover=#0d0d0d | #ededed; soft=#0d0d0d | #ededed; soft-alt=#0d0d0d | #ededed; solid=#ffffff | #0a2646; surface=#0d0d0d | #ededed
--color-text-secondary-*: ghost=#5d5d5d | #cdcdcd; ghost-hover=#0d0d0d | #ededed; outline=#5d5d5d | #cdcdcd; outline-hover=#0d0d0d | #ededed; soft=#0d0d0d | #ededed; soft-alt=#0d0d0d | #ededed; solid=#5d5d5d | #cdcdcd
--color-text-success-*: ghost=#00a240; ghost-hover=#00a240; outline=#00a240; outline-hover=#00a240; soft=#008635 | #04b84c; solid=#fff; surface=#008635 | #04b84c
--color-text-warning-*: ghost=#e25507; ghost-hover=#e25507; outline=#e25507; outline-hover=#e25507; soft=#e25507 | #fb6a22; solid=#ffffff | #0d0d0d; surface=#b9480d | #ff8549

// Intent matrix · borders
--color-border-caution-*: outline=#916f00; outline-hover=#916f00; surface=#ffc300/8% | #ffc300/15%
--color-border-danger-*: outline=#e02e2a/15% | #fa423e/40%; outline-hover=#fa423e/48% | #fa423e/30%; surface=#fa423e/8% | #fa423e/16%
--color-border-discovery-*: outline=#924ff7 | #be95fa; outline-hover=#924ff7 | #be95fa; surface=#924ff7/6% | #924ff7/15%
--color-border-info-*: outline=#0285ff | #66b5ff; outline-hover=#0285ff | #339cff; surface=#0285ff/4% | #0285ff/13%
--color-border-primary-*: outline=#00000026 | #ffffff33; outline-hover=#0d0d0d/20% | #ededed/30%; soft-alt=#0d0d0d/6% | #ededed/6%; surface=#0d0d0d/5% | #ededed/8%
--color-border-secondary-*: outline=#00000026 | #ffffff33; outline-hover=#0d0d0d/20% | #ededed/30%; soft-alt=#0d0d0d/6% | #ededed/6%
--color-border-success-*: outline=#00a240 | #008635; outline-hover=#00a240 | #008635; surface=#04b84c/8% | #04b84c/15%
--color-border-warning-*: outline=#e25507/15% | #ff8549/40%; outline-hover=#e25507; surface=#fb6a22/7% | #fb6a22/16%

// Intent matrix · focus rings
--color-ring-*: caution=#3a83f7; danger=#ff8583; discovery=#3a83f7; info=#3a83f7; primary=#3a83f7; secondary=#3a83f7; success=#3a83f7; warning=#3a83f7

// Chat surfaces (composer, messages, selection, mode toggle)
--color-background-composer-primary: #0a2646 | #03b4ba
--color-background-mode-toggle-selected: #ffffff | #212121
--color-background-mode-toggle-track: rgb(13 13 13 / 3%) | #1b1b1b
--color-background-text-selection: #afafaf66 | #41414166
--color-background-user-message: #000000 | rgb(50 50 50 / 85%)
--color-background-user-message-compact: #f3f3f3 | #414141
--color-border-mode-toggle-selected: #0000001a | transparent
--color-text-composer-primary: #ffffff | #0a2646
--color-text-composer-reference: #3a83f7 | #63a8f8
--color-text-mode-toggle-*: accent=#3a83f7 | #63a8f8; inactive=#5d5d5d | #cdcdcd; primary=#0d0d0d | #ffffff
--color-text-user-message: #ffffff
--shadow-mode-toggle-selected: 0 1px 6px 0 rgb(0 0 0 / 5%) | none

// Charts
--color-chart-sequential-*: 1=#cce6ff | #013566; 2=#66b5ff | #004f99; 3=#0285ff; 4=#004f99 | #66b5ff

// Typography · families
--font-mono: ui-monospace, "SFMono-Regular", "SF Mono", menlo, consolas, "Liberation Mono", monospace
--font-mono-default: ui-monospace, "SFMono-Regular", "SF Mono", menlo, consolas, "Liberation Mono", monospace
--font-base-sans: "Inter Variable", "Inter", -apple-system-body, ui-sans-serif, -apple-system, system-ui, "Segoe UI", "Helvetica", "Apple Color Emoji", "Arial", sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
--font-sans: -apple-system-body, ui-sans-serif, -apple-system, system-ui, "Segoe UI", "Helvetica", "Apple Color Emoji", "Arial", sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
--font-sans-default: -apple-system-body, ui-sans-serif, -apple-system, system-ui, "Segoe UI", "Helvetica", "Apple Color Emoji", "Arial", sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"
--font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif

// Typography · heading scale
--font-heading-2xl-*: line-height=42px; size=36px; tracking=-0.025em; weight=600
--font-heading-3xl-*: line-height=48px; size=48px; tracking=-0.025em; weight=600
--font-heading-4xl-*: line-height=60px; size=60px; tracking=-0.025em; weight=600
--font-heading-5xl-*: line-height=72px; size=72px; tracking=-0.025em; weight=600
--font-heading-lg-*: line-height=28px; size=24px; tracking=0em; weight=600
--font-heading-md-*: line-height=26px; size=20px; tracking=0em; weight=600
--font-heading-sm-*: line-height=26px; size=18px; tracking=0em; weight=600
--font-heading-xl-*: line-height=38px; size=32px; tracking=-0.025em; weight=600
--font-heading-xs-*: line-height=24px; size=16px; tracking=0em; weight=600

// Typography · text scale
--font-text-2xs-*: line-height=14px; size=10px; tracking=0.025em; weight=400
--font-text-3xs-*: line-height=12px; size=8px; tracking=0.025em; weight=400
--font-text-lg-*: line-height=29px; size=18px; tracking=0em; weight=400
--font-text-md-*: line-height=24px; size=16px; tracking=0em; weight=400
--font-text-sm-*: line-height=20px; size=14px; tracking=0em; weight=400
--font-text-xs-*: line-height=18px; size=12px; tracking=0.025em; weight=400

// Typography · small caps
--font-small-caps-lg-*: line-height=19px; size=13px; tracking=0.6px; weight=600
--font-small-caps-md-*: line-height=15px; size=11px; tracking=0.65px; weight=600

// Typography · weights, tracking, leading
--font-weight-*: bold=700; light=300; medium=500; normal=400; semibold=600
--leading-*: dense=calc(7 / 6); normal=1.5; relaxed=1.625; snug=1.375; tight=1.25
--tracking-*: normal=0em; tight=-0.025em; tooltip=-0.15px; wide=0.025em

// Radius (corner-radius-scale = 1 on web, 1.25 + superellipse in the desktop app)
--corner-radius-scale: 1
--radius-*: 2xl=16px; 2xs=2px; 3xl=24px; 4xl=32px; full=9999px; lg=8px; md=6px; sm=4px; xl=12px; xs=2px

// Shadows & elevation
--elevation-*: composer=0 0 0 1px #0000000a, 0 2px 8px 0 #0000000a, 0 4px 80px 8px #00000006; composer-dark=inset 0 0 1px 0 #fff3; prominent=0 0 0 0.5px #00000026, 0 3px 7.5px #0000000a, 0 0 20px #0000000d; sidebar=0 0 0 0.5px #00000026, 0 3px 7.5px #00000008, 0 0 16px #00000005; stroke=0 0 0 0.5px #00000026
--shadow-*: 2xl=0px 16px 32px -8px #00000030; card=0px 4px 16px 0px #0000000d; dropdown-overlay=0px 0px 0px 0.5px #0000001a, 0px 8px 16px -4px #0000001f | inset 0 0 1px 0 #fff3, 0px 8px 16px -4px #0000001f; hairline=0px 0px 0px 0.5px #0000001a | 0 0 0 0.5px #ffffff1f; lg=0px 4px 8px -2px #0000001a; lg-stronger=0px 4px 8px -2px #00000029; md=0px 2px 4px -1px #00000014; popover-overlay=0 0 0 1px #0000000a, 0 2px 8px 0 #0000000a, 0 4px 80px 8px #00000006 | inset 0 0 1px 0 #fff3; sm=0px 1px 2px -1px #00000014; sm-stronger=0px 1px 2px -1px #00000021; tooltip=0 8px 18px #0f172a33; xl=0px 8px 16px -4px #0000001f; xl-spread=0px 0px 0px 0.5px #0000001a, 0px 8px 16px -4px #0000001f

// Controls · shared size scale
--control-font-size-*: lg=16px; md=14px; sm=12px
--control-gutter-*: 2xs=6px; lg=14px; md=12px; sm=10px; xl=16px; xs=8px
--control-icon-size-*: 2xl=24px; lg=20px; md=18px; sm=16px; xl=22px; xs=14px
--control-radius-*: lg=8px; md=8px; sm=4px; xl=12px
--control-size-*: 2xl=44px; 2xs=24px; 3xl=48px; 3xs=22px; 4xs=20px; lg=36px; md=32px; sm=28px; xl=40px; xs=26px

// Controls · menus
--app-menu-*: gutter=10px; item-height=36px; item-padding=6px 10px; min-width=240px; separator-gutter=8px
--menu-item-*: background-color=#0d0d0d/8% | #ededed/10%; gap=6px; padding=8px 12px; radius=8px

// Controls · tooltip
--tooltip-*: background-color=#ffffff | #212121; border-radius=6px; box-shadow=0 10px 15px -3px #0000001a, 0 4px 6px -4px #0000001a, 0px 0px 0px 0.5px #0000001a | 0 10px 15px -3px #0003, 0 4px 6px -4px #0003, 0 0 0 0.5px #ffffff1f; compact-background-color=#0d0d0d | #fff; compact-font-size=12px; compact-font-weight=600; compact-interactive-background-color-hover=#414141 | #8f8f8f; compact-interactive-text-color-hover=#fff | #0d0d0d; compact-padding=4px 8px; compact-text-color=#fff | #0d0d0d; font-size=14px; font-weight=400; line-height=1.45; padding-lg=14px 18px; padding-md=12px 16px; padding-sm=8px 12px; text-color=#0d0d0d | #ededed

// Controls · switch
--switch-*: label-gap=8px; thumb-color=#fff; thumb-color-disabled=#fff | #cdcdcd; thumb-offset=3px; thumb-shadow=0 1px 2px #0003; thumb-size=calc(19px - 2 * 3px); track-color=#0d0d0d/10% | #ededed/10%; track-color-checked=#3a83f7; track-color-checked-disabled=#3a83f7/50%; track-color-disabled=#ededed | #303030; track-color-hover=#0d0d0d/10% | #ededed/10%; track-height=19px; track-width=32px

// Controls · segmented control
--segmented-control-*: background=#ededed | #0d0d0d; font-weight=600; gap=2px; gutter=2px; option-highlight-background-color=#cdcdcd | #303030; option-highlight-gutter=1px; thumb-background=#fff | #303030; thumb-shadow=0 1px 4px -1px #0003

// Controls · radio
--radio-group-*: col-gap=10px; indicator-background-color=#0a2646 | #03b4ba; indicator-border-color=#00000026 | #ffffff33; indicator-border-color-hover=#0d0d0d/25% | #ededed/25%; indicator-hole-background-color=#ffffff | #0a2646; indicator-hole-size=6px; indicator-size=16px; item-font-size=14px; item-gap=6px; item-line-height=20px; row-gap=20px

// Controls · badge
--badge-font-size-*: lg=14px; md=14px; sm=12px
--badge-font-weight-*: lg=600; md=600; sm=600
--badge-gutter-*: lg=8px; md=6px; sm=5px
--badge-icon-font-size-*: lg=16px; md=16px; sm=12px
--badge-indicator-size-*: lg=14px; md=12px; sm=12px
--badge-radius-*: lg=4px; md=2px; sm=2px
--badge-size-*: lg=24px; md=22px; sm=20px
--badge-tracking-*: lg=0em; md=0em; sm=0.025em

// Controls · modal
--modal-*: backdrop-background=#0000004d | #00000080; container-inner-padding=20px; radius=16px

// Controls · inputs
--input-gap-*: lg=10px; md=8px; sm=6px; xs=4px

// Motion
--cubic-enter: cubic-bezier(0.19, 1, 0.22, 1)
--cubic-exit: cubic-bezier(0.8, 0, 0.4, 1)
--cubic-exit-snappy: cubic-bezier(0.65, 0, 0.4, 1)
--cubic-move: cubic-bezier(0.65, 0, 0.35, 1)
--default-transition-duration: 0.15s
--default-transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1)
--ease-basic: ease
--ease-enter: cubic-bezier(0.19, 1, 0.22, 1)
--ease-enter-snappy: cubic-bezier(0.23, 1, 0.32, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--transition-duration-basic: 0.15s
--transition-duration-relaxed: 0.3s

// Tailwind text-* sizes (web build overrides on <html>)
--text-*: xs=12px; sm=14px; base=16px; lg=18px; xl=20px; 2xl=24px; 3xl=30px; 4xl=36px
--text-heading-*: sm=18px; md=20px; lg=24px; app=28px
--font-ui-size: 16px
--font-code-size: 12px

// Layout (measured on the base app, web build)
--spacing: 4px
--height-titlebar: 44px
--height-toolbar: 52px
--height-toolbar-sm: 36px
--height-token-nav-row: 36px  /* web build override (30px in the desktop app) */
--padding-row-x: 6px
--padding-row-y: 6px
--radius-token-row: 10px
--width-rail: 52px  /* measured icon rail */
--spacing-token-sidebar: clamp(240px, 288px, min(520px, calc(100vw - 320px)))  /* measured 288px panel; preferred width is user-resizable */
--thread-content-max-width: 768px  /* measured composer + thread column (48rem) */
--composer-radius: 28px
--composer-single-line-height: 52px  /* measured; body radius 26px = pill */
--composer-gutter: 12px
--spacing-token-button-composer: 36px
--border-width-hairline: 0.5px
--app-shell-window-radius: 16px
--app-shell-sidebar-popover-radius: 14px

```

### site tokens (tokens/site.css · base · 498 tokens, 183 with dark values)

```css
// Primitive · hue ramps (constant; 400 is the anchor step)
--color-primitive-blue-*: 25=#f6fafe; 50=#e8f3fe; 75=#d1e5fd; 100=#a4cdfb; 200=#63a8f8; 300=#539af8; 400=#3a83f7; 500=#2c67c5; 600=#1f4e94; 700=#173e76; 800=#133463; 900=#0c274a; 1000=#020d18
--color-primitive-gray-*: 0=#fff; 50=#f9f9f9; 75=#f3f3f3; 100=#e8e8e8; 200=#cdcdcd; 300=#afafaf; 400=#8f8f8f; 500=#5d5d5d; 600=#414141; 700=#303030; 800=#212121; 900=#181818; 1000=#000
--color-primitive-green-*: 25=#effaf3; 50=#def3e5; 75=#c2eace; 100=#9fddb1; 200=#83d197; 300=#6bc67f; 400=#53b559; 500=#48a04c; 600=#3a843f; 700=#2c6732; 800=#1f4e25; 900=#14361a; 1000=#041208
--color-primitive-orange-*: 25=#fdf5f1; 50=#fbe8db; 75=#f7d1b8; 100=#f4ba96; 200=#f1a275; 300=#ef8b57; 400=#ee7c37; 500=#d25e28; 600=#ac4f23; 700=#87401d; 800=#653218; 900=#45240d; 1000=#1f1209
--color-primitive-pink-*: 25=#fef8fb; 50=#fdedf4; 75=#fcd8e7; 100=#fbbfd7; 200=#f8a6c8; 300=#f68ebc; 400=#f077af; 500=#cf6194; 600=#ab4f7a; 700=#873e60; 800=#663049; 900=#462132; 1000=#1d0f15
--color-primitive-purple-*: 25=#f8f5fd; 50=#ede5fc; 75=#ddcffa; 100=#c9b1f6; 200=#b897f4; 300=#a67df2; 400=#8952ee; 500=#7849d1; 600=#643cae; 700=#4e2f88; 800=#3b2366; 900=#291947; 1000=#0f0a18
--color-primitive-red-*: 25=#fff4f3; 50=#ffe5e0; 75=#ffc9c0; 100=#ffaa9c; 200=#ff8583; 300=#ff6764; 400=#fa423e; 500=#de282f; 600=#ba2623; 700=#92201d; 800=#6d1b18; 900=#4a130d; 1000=#1f0a07
--color-primitive-teal-*: 25=#f0fdfb; 50=#dff9f4; 75=#c2f5eb; 100=#9ceede; 200=#79e8d1; 300=#47e2c2; 400=#0fd9ae; 500=#05c099; 600=#049f7f; 700=#0a7c64; 800=#055f4c; 900=#074236; 1000=#031714
--color-primitive-yellow-*: 25=#fefbee; 50=#fdf6dc; 75=#fcefbe; 100=#fae598; 200=#f9dc78; 300=#f8d45d; 400=#f6c543; 500=#d9a337; 600=#b8802b; 700=#95611f; 800=#734615; 900=#51300c; 1000=#221403

// Brand ramps (theme-aware: dark mirrors step N to 1000-N around 400)
--color-brand-blue-*: 25=#f6fafe | #020d18; 50=#e8f3fe | #0c274a; 75=#d1e5fd | #133463; 100=#a4cdfb | #173e76; 200=#63a8f8 | #1f4e94; 300=#539af8 | #2c67c5; 400=#3a83f7; 500=#2c67c5 | #539af8; 600=#1f4e94 | #63a8f8; 700=#173e76 | #a4cdfb; 800=#133463 | #d1e5fd; 900=#0c274a | #e8f3fe; 1000=#020d18 | #f6fafe
--color-brand-gray-*: 0=#fff | #000; 50=#f9f9f9 | #000; 75=#f3f3f3 | #212121; 100=#e8e8e8 | #303030; 200=#cdcdcd | #414141; 300=#afafaf | #5d5d5d; 400=#8f8f8f; 500=#5d5d5d | #afafaf; 600=#414141 | #cdcdcd; 700=#303030 | #e8e8e8; 800=#212121 | #f3f3f3; 900=#181818 | #f9f9f9; 1000=#000 | #fff
--color-brand-green-*: 25=#effaf3 | #041208; 50=#def3e5 | #14361a; 75=#c2eace | #1f4e25; 100=#9fddb1 | #53b559; 200=#83d197 | #3a843f; 300=#6bc67f | #48a04c; 400=#53b559; 500=#48a04c | #6bc67f; 600=#3a843f | #83d197; 700=#2c6732 | #9fddb1; 800=#1f4e25 | #c2eace; 900=#14361a | #def3e5; 1000=#041208 | #effaf3
--color-brand-orange-*: 25=#fdf5f1 | #1f1209; 50=#fbe8db | #45240d; 75=#f7d1b8 | #653218; 100=#f4ba96 | #ee7c37; 200=#f1a275 | #ac4f23; 300=#ef8b57 | #d25e28; 400=#ee7c37; 500=#d25e28 | #ef8b57; 600=#ac4f23 | #f1a275; 700=#87401d | #f4ba96; 800=#653218 | #f7d1b8; 900=#45240d | #fbe8db; 1000=#1f1209 | #fdf5f1
--color-brand-pink-*: 25=#fef8fb | #1d0f15; 50=#fdedf4 | #462132; 75=#fcd8e7 | #663049; 100=#fbbfd7 | #873e60; 200=#f8a6c8 | #ab4f7a; 300=#f68ebc | #cf6194; 400=#f077af; 500=#cf6194 | #f68ebc; 600=#ab4f7a | #f8a6c8; 700=#873e60 | #fbbfd7; 800=#663049 | #fcd8e7; 900=#462132 | #fdedf4; 1000=#1d0f15 | #fef8fb
--color-brand-purple-*: 25=#f8f5fd | #0f0a18; 50=#ede5fc | #291947; 75=#ddcffa | #3b2366; 100=#c9b1f6 | #4e2f88; 200=#b897f4 | #643cae; 300=#a67df2 | #7849d1; 400=#8952ee; 500=#7849d1 | #a67df2; 600=#643cae | #b897f4; 700=#4e2f88 | #c9b1f6; 800=#3b2366 | #ddcffa; 900=#291947 | #ede5fc; 1000=#0f0a18 | #f8f5fd
--color-brand-red-*: 25=#fff4f3 | #1f0a07; 50=#ffe5e0 | #4a130d; 75=#ffc9c0 | #6d1b18; 100=#ffaa9c | #92201d; 200=#ff8583 | #ba2623; 300=#ff6764 | #de282f; 400=#fa423e; 500=#de282f | #ff6764; 600=#ba2623 | #ff8583; 700=#92201d | #ffaa9c; 800=#6d1b18 | #ffc9c0; 900=#4a130d | #ffe5e0; 1000=#1f0a07 | #fff4f3
--color-brand-teal-*: 25=#f0fdfb | #031714; 50=#dff9f4 | #074236; 75=#c2f5eb | #055f4c; 100=#9ceede | #0a7c64; 200=#79e8d1 | #049f7f; 300=#47e2c2 | #05c099; 400=#0fd9ae; 500=#05c099 | #47e2c2; 600=#049f7f | #79e8d1; 700=#0a7c64 | #9ceede; 800=#055f4c | #c2f5eb; 900=#074236 | #dff9f4; 1000=#031714 | #f0fdfb
--color-brand-yellow-*: 25=#fefbee | #221403; 50=#fdf6dc | #51300c; 75=#fcefbe | #734615; 100=#fae598 | #95611f; 200=#f9dc78 | #b8802b; 300=#f8d45d | #d9a337; 400=#f6c543; 500=#d9a337 | #f8d45d; 600=#b8802b | #f9dc78; 700=#95611f | #fae598; 800=#734615 | #fcefbe; 900=#51300c | #fdf6dc; 1000=#221403 | #fefbee

// Ground
--color-background: #fff | #000
--color-background-pink: #fef5fb | color-mix(in srgb, #c759ab 12%, #000)

// Ink ladder · primary (alpha)
--color-primary-*: 2=#00000005 | #ffffff14; 4=#0000000a | #ffffff1f; 12=#0000001f | #fff3; 44=#00000070 | #ffffff70; 60=#0009 | #fff9; 80=#000c | #fffc; 100=#000 | #fff; inactive=#ffffff70; nav=#ffffff70

// Ink ladder · primary (solid equivalents)
--color-primary-solid-*: 4=#f5f5f5 | #1f1f1f; 12=#e0e0e0 | #333; 44=#8f8f8f | #707070; 60=#666 | #999; 80=#333 | #ccc; 100=#000 | #fff; inactive=#707070; nav=#707070

// Primary button
--color-cta-*: fill=#0a2646 | #03b4ba; hover=#1b3a5e | #35c3c8; text=#ffffff | #0a2646

// Ink ladder · secondary (inverse ink: text on dark media / inverted blocks)
--color-secondary-*: 4=#ffffff0a | #0000000a; 12=#ffffff1f | #0000001f; 44=#ffffff70 | #00000070; 60=#fff9 | #0009; 80=#fffc | #000c; 100=#fff | #000

// Ink ladder · secondary (solid)
--color-secondary-solid-*: 4=#0a0a0a | #f5f5f5; 12=#1f1f1f | #e0e0e0; 44=#707070 | #8f8f8f; 60=#999 | #666; 80=#ccc | #333; 100=#fff | #000

// Ink ladder · tertiary (quiet fills)
--color-tertiary-*: 60=#f1f1f1ad | #505050ad; 80=#f1f1f1cc | #333c; 100=#f1f1f1 | #1f1f1f; hint=#ffffff70

// Ink ladder · tertiary (solid)
--color-tertiary-solid-*: 60=#a4a4a4 | #888; 80=#c1c1c1 | #5c5c5c; 100=#f1f1f1 | #1f1f1f; hint=#707070

// Scrims
--color-scrim-dark: #00000059
--color-scrim-dark-75: #000000bf

// Illustration hues
--color-hue-*: blue=#29bdfd | #36a6d7; lime=#9dca1c | #8fac39; magenta=#eb56c5 | #c759ab; red=#f53255 | #ed6079; yellow=#ffaf00 | #e2a727

// Code syntax
--color-syntax-*: comment=#00000070 | #ffffff70; const=#d6008d | #ff00a8; copy=#000 | #fff; data=#1d7899 | #2392ba; error=#f22f4d | #e80d2f; function=#7a4ff5 | #916bff; highlight=#0000000a | #ffffff14; keyword=#1e60e4 | #4080ff; operator=#c93b00 | #ed4b00; string=#027f41 | #03a354; variable=#8a6e07 | #ac8601

// Diff
--color-diff-add-content: #e6ffec | #14261f
--color-diff-del-content: #ffebe9 | #311b1f

// Chart ramps (5 steps per hue, 20 = lightest in light mode)
--color-blue-*: 20=#e8f3fe | #173e76; 40=#a4cdfb | #2c67c5; 60=#539af8; 80=#2c67c5 | #a4cdfb; 100=#173e76 | #e8f3fe
--color-gray-*: 20=#f3f3f3 | #303030; 40=#cdcdcd | #5d5d5d; 60=#8f8f8f; 80=#5d5d5d | #cdcdcd; 100=#303030 | #f3f3f3
--color-green-*: 20=#def3e5 | #1f4e25; 40=#9fddb1 | #3a843f; 60=#53b559; 80=#3a843f | #9fddb1; 100=#1f4e25 | #def3e5
--color-orange-*: 20=#fbe8db | #653218; 40=#f4ba96 | #ac4f23; 60=#ee7c37; 80=#ac4f23 | #f4ba96; 100=#653218 | #fbe8db
--color-pink-*: 20=#fdedf4 | #663049; 40=#fbbfd7 | #ab4f7a; 60=#f077af; 80=#ab4f7a | #fbbfd7; 100=#663049 | #fdedf4
--color-yellow-*: 20=#fdf6dc | #734615; 40=#fae598 | #b8802b; 60=#f6c543; 80=#b8802b | #fae598; 100=#734615 | #fdf6dc

// Typography · families
--font-*: lf="LF Serif", "Source Serif 4", Georgia, serif  /* editorial serif; fallback added */; mono="SF Mono", Consolas, "Liberation Mono", ui-monospace, monospace; sans="Inter Variable", "Inter", -apple-system, system-ui, sans-serif  /* see assets/fonts.md */

// Typography · fluid scale (375px -> 1440px viewport)
--type-2xs-*: line=10.56px; size=8px; track=clamp(-0.01em, calc(-0.01em + 0.01 * ((1440px - 100vw) / 66.5625)), 0em); weight=400
--type-caption-*: line=22.96px; size=14px; track=0em; weight=400
--type-code-*: snippet-line=fluid(21.32px→22.96px); snippet-size=fluid(13px→14px); snippet-track=0em; snippet-weight=400
--type-cta-*: line=14px; size=14px; track=0em; weight=500
--type-h1-*: line=fluid(36.48px→64px); size=fluid(32px→64px); track=-0.03em; weight=500
--type-h2-5-*: line=fluid(27.6px→43.792px); size=fluid(24px→38.08px); track=-0.02em; weight=500
--type-h2-*: line=fluid(36.48px→55.68px); size=fluid(32px→48px); track=clamp(-0.03em, calc(-0.03em + 0.02 * ((1440px - 100vw) / 66.5625)), -0.01em); weight=500
--type-h3-*: line=fluid(31.68px→39.6px); size=fluid(24px→30px); track=-0.01em; weight=500
--type-h4-*: line=fluid(24px→27.72px); size=fluid(20px→22px); track=-0.01em; weight=500
--type-h5-*: line=fluid(20px→23.76px); size=fluid(16px→18px); track=-0.01em; weight=500
--type-h6-*: line=fluid(20px→23.76px); size=fluid(16px→18px); track=-0.01em; weight=500
--type-meta-*: line=19.6px; size=14px; track=0em; weight=500
--type-nav-*: desktop-line=22.96px; desktop-size=14px; desktop-track=0em; desktop-weight=500; header-line=19.68px; header-secondary-line=16.8px; header-secondary-size=13px; header-secondary-track=-0.01em; header-secondary-weight=600; header-size=13px; header-track=0em; header-weight=500; line=fluid(20px→22.96px); mobile-line=20px; mobile-size=16px; mobile-track=0em; mobile-weight=500; size=clamp(14px, calc(14px + 0.125 * ((1440px - 100vw) / 66.5625)), 16px); track=0em; weight=500
--type-p1-*: line=27.999px; size=17px; track=-0.01em; weight=400
--type-p2-*: line=22.96px; size=14px; track=-0.01em; weight=400
--type-supply-*: accent-line=16.8px; accent-size=14px; accent-track=-0.24px; accent-weight=500
--type-xl-*: line=fluid(64px→112px); size=fluid(64px→112px); track=-0.02em; weight=500
--type-xs-*: line=13.2px; size=10px; track=clamp(-0.01em, calc(-0.01em + 0.01 * ((1440px - 100vw) / 66.5625)), 0em); weight=400

// Typography · weights, tracking, leading
--font-weight-*: black=900; bold=700; light=300; medium=500; normal=400; semibold=600
--leading-*: normal=1.5; relaxed=1.625; snug=1.375; tight=1.25
--tracking-*: normal=0em; tight=-0.025em; wider=0.05em; widest=0.1em

// Radius
--radius-*: 2xl=16px; 3xl=24px; 4xl=32px; full=9999px; lg=16px; md=6.08px; none=0; sm=4px; xl=32px; xs=2px

// Layout
--anchor-scroll-clearance: 12px
--breakpoint-nav-desktop: 1020px
--container-*: 2xl=1440px; lg=960px; md=704px; sm=520px; xl=1216px
--header-h: 64px
--max-width-container-desktop: 1440px
--max-width-fullbleed: 3840px
--spacing: 4px
--spacing-nav-l2-width: 250px
--spacing-v: 27px
--toc-button-h: 28px

// Shadow
--drop-shadow-sm: 0 1px 2px #00000026

// Motion · durations
--transition-duration-*: 600=0.6s; 625=0.625s; 800=0.8s; 2000=2s; fast=0.1s; long=0.4s; medium=0.3s; short=0.2s; sidebar=0.64s

// Motion · delays
--transition-delay-*: fast=0.1s; normal=0.3s; slow=0.8s

// Motion · curves
--ease-in: cubic-bezier(0.4, 0, 1, 1)
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1)
--ease-out: cubic-bezier(0, 0, 0.2, 1)
--transition-timing-function-*: curve-a=cubic-bezier(0, 0, 1, 1); curve-b=cubic-bezier(0.25, 0, 0.75, 1); curve-c=cubic-bezier(0, 0.56, 0.46, 1); curve-d=cubic-bezier(0.6, 0, 0.4, 1); curve-e=cubic-bezier(0.5, 1.25, 0, 1); curve-f=cubic-bezier(0.6, 0.01, 0.49, 1); curve-sidebar=cubic-bezier(0.22, 1, 0.36, 1); out-cubic=cubic-bezier(0.33, 1, 0.68, 1); parameter-golf=cubic-bezier(0.39, 0.575, 0.565, 1); primary=cubic-bezier(0.17, 0.17, 0.3, 1)

// Motion · named animations
--animate-*: content-show=content-show 0.2s cubic-bezier(0.17, 0.17, 0.3, 1); dialog-hide=fade-out 0.2s cubic-bezier(0.17, 0.17, 0.3, 1); overlay-show=fade-in 0.2s cubic-bezier(0.17, 0.17, 0.3, 1); side-panel-hide=slide-out-end 0.3s cubic-bezier(0.17, 0.17, 0.3, 1); side-panel-overlay-hide=fade-out 0.3s cubic-bezier(0.17, 0.17, 0.3, 1); side-panel-overlay-show=fade-in 0.3s cubic-bezier(0.17, 0.17, 0.3, 1); side-panel-show=slide-in-end 0.3s cubic-bezier(0.17, 0.17, 0.3, 1)

// Layout (from <html> inline style + measured)
--gutter-size: max(20px, calc((100vw - 68rem) / 2))  /* article text column = 68rem (1088px) */
--media-gutter-size: max(20px, calc((100vw - 1728px) / 2))  /* wide media column = 1728px */
--header-h-mobile: 54px  /* source base value (3.375rem); --header-h resolves to 64px on desktop */
--page-padding-x: 24px  /* px-6 on mobile; 32px (px-8) from md */
--page-padding-x-md: 32px
--section-gap: 120px  /* measured gap between homepage sections (mt-30) */
--section-header-gap: 32px  /* section title row -> grid (mb-8) */
--grid-gap: 24px  /* card grids (gap-6) */
--button-height: 40px  /* pill CTA (2.5rem); 36px in the header */
--button-height-sm: 36px
--button-padding-x: 20px
--button-radius: 40px
--media-radius: 6.08px  /* rounded-md (.38rem) on card media */

```
