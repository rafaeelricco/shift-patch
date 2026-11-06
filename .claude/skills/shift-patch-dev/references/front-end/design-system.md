# Design System

## Overview

ShiftPatch covers open nursing shifts in real time: agencies post, credentialed nurses claim, and administrators see who covers what. The interface is near-monochrome ink on a quiet ground, with navy on the one action and every other colour reporting a shift or a credential.

**Principles**

- **The action is navy.** One solid action per view: Claim shift, Post a shift, Sign in. The label is always white in light.
- **Colour reports status.** Open, filled, valid, expired, pending. Everything that is not a status stays ink, and the word always sits beside the colour.
- **Coverage reads at a glance.** An administrator scans who covers what: two stat cards, then the coverage table. Figures line up in columns, and a missing nurse is a dash, never a blank.
- **Blocked is explained.** A nurse with a lapsed credential can still press Claim shift. The banner says why it failed, so nothing is quietly hidden.

**Two systems, one visual DNA.** The **app system** is what ShiftPatch ships: dense product UI, the system font, one light theme. The **site system** is specified for marketing pages and isn't built. Its tokens carry the prefix `site-`. Use one system per surface, because mixing them changes the character. Pulling site type into the app, or the reverse, needs a decision first.

**Where things live**

- Tokens are in `app/globals.css`. Values sit in `:root` and `@theme inline` maps names to Tailwind utilities. Component styles are Tailwind utilities, with `cva()` for prop-switched classes, in each `components/ui` file (`buttonVariants`, `fieldControl`, `surfaceCard`). There is no `tailwind.config.*` and no `@layer components`.
- The product ships one light theme. `:root` has `color-scheme: light`, and there are no `dark:` classes.
- Shared UI is flat in `components/ui/`, imported as `@ui/<name>`. `cn` is `@lib/utils`.
- The full spec is the ShiftPatch design-system artifact (https://claude.ai/artifact/7ZeR3z5DNXgWyUQKD56WbK). Its `README.md` is the brand book, its `tokens.json` holds every token in light and dark, site tokens included, and each card under `components/` gives one component's spec and preview. Read a card before building what it describes.
- Authority: the artifact's `tokens.json` wins on retained token values; drop-shadow tokens are intentionally excluded, and `app/globals.css` must match it. Shipped code wins on component APIs and on what's built, so where a card is behind `components/ui/`, follow the code and note the gap under Where the spec and the code differ. This file wins on intent. Fix the loser in the same change. A token added or changed in `app/globals.css` is documented here in the same diff.

## Colors

Use semantic tokens, never raw hex or a primitive ramp (`--gray-*`, `--blue-*`). Hue ramps are for charts and illustration. Names below drop the leading `--`. The product ships light only. The artifact's `dark` values are there for when a dark theme is built, and every new colour needs a value in both.

### Surfaces

The ground is `color-surface` (`#fcfcfc`), never pure white. Anything floating or typed into is pure white. Flat fills and crisp hairline frames separate containers; they cast no shadows. In dark the ground is near-black (`#0e0e0e`), and raised layers step to `#212121` and `#303030`.

| Token                                     | Value     | Utility                 | Use                                                                 |
| ----------------------------------------- | --------- | ----------------------- | ------------------------------------------------------------------- |
| `color-surface`                           | `#fcfcfc` | `bg-surface`            | The ground, the section shell's main pane                           |
| `color-surface-tertiary`                  | `#f9f9f9` | `bg-surface-tertiary`   | Table row hover, table footer                                       |
| `app-color-background-shell`              | `#f9f9f9` | `bg-shell`              | Shell ground in the spec                                            |
| `app-color-background-elevated-secondary` | `#f3f3f3` | `bg-elevated-secondary` | Muted ground behind the sign-in card and the section shell          |
| `color-surface-card`                      | `#ffffff` | `bg-card`               | `surfaceCard`, sign-in card, table frame                            |
| `color-surface-elevated`                  | `#ffffff` | `bg-elevated`           | Modal, sheet, menus, select list, popover, command                  |
| `color-background-control-opaque`         | `#ffffff` | `bg-control`            | Inputs, select trigger, checkbox, tags field                        |
| `color-background-secondary-soft`         | `#f3f3f3` | `bg-secondary-soft`     | File button, tag chips, the calendar's today and selected-range day |

### Text

| Token                      | Value     | Utility                 | Use                                     |
| -------------------------- | --------- | ----------------------- | --------------------------------------- |
| `color-text-primary`       | `#0d0d0d` | `text-primary`          | Body and titles                         |
| `color-text-secondary`     | `#5d5d5d` | `text-secondary`        | Anything else a user must read          |
| `color-text-tertiary`      | `#8f8f8f` | `text-tertiary`         | Placeholders only: about 3.2:1 on white |
| `color-text-disabled`      | `#8f8f8f` | `text-disabled`         | Disabled controls                       |
| `color-text-inverse`       | `#ffffff` | `text-inverse`          | Text on a dark fill                     |
| `app-color-text-accent`    | `#2c67c5` | `text-accent`           | Links                                   |
| `color-text-danger`        | `#e02e2a` | `text-danger`           | Field errors, destructive menu items    |
| `color-text-primary-solid` | `#ffffff` | `text-on-primary-solid` | The label on the navy action            |

### Action

| Token                                   | Value     | Use                                       |
| --------------------------------------- | --------- | ----------------------------------------- |
| `color-background-primary-solid`        | `#0a2646` | The one action, at rest                   |
| `color-background-primary-solid-hover`  | `#1b3a5e` | Hover                                     |
| `color-background-primary-solid-active` | `#2b4a6f` | Pressed                                   |
| `color-text-primary-solid`              | `#ffffff` | Its label                                 |
| `color-ring`                            | `#3a83f7` | Focus ring, 2px                           |
| `color-ring-danger`                     | `#ff8583` | Focus ring on danger and invalid controls |

The hues come from the logo (`brand-navy`, `brand-teal`). In dark the action is teal with a navy label. Never put a white label on teal, which is 2.55:1. **Blue is never the primary button.** `color-ring`, links, the `open` status, inline references and the checked switch are its only jobs.

**The utility trap.** The theme maps `--color-primary` to text ink, so `bg-primary` is `#0d0d0d`, not navy. `bg-secondary` is `#5d5d5d` and `bg-accent` is `#2c67c5`, both text colours. The action is `Button` with `variant="solid-primary"`, or `bg-primary-solid` with `text-on-primary-solid`. Shadcn names such as `text-muted-foreground`, `bg-popover` and `border-input` generate nothing here. See `tailwind.md`.

### Intents

Every interactive colour comes from one grid of 8 intents by 6 variants, named `color-{background|text|border}-{intent}-{variant}`, with `-hover` and `-active` states where they exist. Match the set: `solid` takes `text-*-solid`, `soft` and `soft-alpha` take `text-*-soft`, `outline` adds `border-*-outline`, `ghost` has no fill until hover, and `surface` adds `border-*-surface`. `soft` is the opaque form of `soft-alpha`.

Cells read fill / text, or fill / text / border for `surface`. `N%` means that hex at N% alpha.

| Intent      | `solid`               | `soft`        | `soft-alpha` / text       | `outline` text / border   | `ghost` text / hover      | `surface`                               |
| ----------- | --------------------- | ------------- | ------------------------- | ------------------------- | ------------------------- | --------------------------------------- |
| `primary`   | `#0a2646` / `#ffffff` | `#ffffff`     | `#f3f3f3` / `#0d0d0d`     | `#0d0d0d` / `#00000026`   | `#0d0d0d` / `#0000000d`   | `#0d0d0d 5%` / `#0d0d0d` / `#0d0d0d 5%` |
| `secondary` | `#f3f3f3` / `#5d5d5d` | `#f3f3f3`     | `#0000000d` / `#0d0d0d`   | `#5d5d5d` / `#00000026`   | `#5d5d5d` / `#0000000d`   | none                                    |
| `info`      | `#3a83f7` / `#000000` | `#2c67c5 30%` | `#0285ff 13%` / `#3a83f7` | `#0285ff` / `#0285ff`     | `#0169cc` / `#0285ff 13%` | `#e8f3fe` / `#004f99` / `#0285ff 4%`    |
| `success`   | `#008635` / `#ffffff` | `#d9f4e4`     | `#04b84c 15%` / `#008635` | `#00a240` / `#00a240`     | `#00a240` / `#04b84c 15%` | `#edfaf2` / `#008635` / `#04b84c 8%`    |
| `warning`   | `#e25507` / `#ffffff` | `#ffe7d9`     | `#fb6a22 16%` / `#e25507` | `#e25507` / `#e25507 15%` | `#e25507` / `#fb6a22 16%` | `#fff5f0` / `#b9480d` / `#fb6a22 7%`    |
| `caution`   | `#ffc300` / `#ffffff` | `#fff6d9`     | `#ffc300 15%` / `#6e5400` | `#916f00` / `#916f00`     | `#916f00` / `#ffc300 15%` | `#ffc300 8%` / `#6e5400` / `#ffc300 8%` |
| `danger`    | `#e02e2a` / `#ffffff` | `#ffd9d9`     | `#fa423e 16%` / `#e02e2a` | `#fa423e` / `#e02e2a 15%` | `#e02e2a` / `#fa423e 16%` | `#fff0f0` / `#ba2623` / `#fa423e 8%`    |
| `discovery` | `#924ff7` / `#ffffff` | `#efe5fe`     | `#924ff7 15%` / `#6b3ab4` | `#924ff7` / `#924ff7`     | `#8046d9` / `#924ff7 15%` | `#924ff7 6%` / `#6b3ab4` / `#924ff7 6%` |

Jobs: `primary` is the action, `secondary` is the file picker and quiet fills, and `info`, `success`, `warning` and `danger` report status beside the word. `caution` and `discovery` have no job in ShiftPatch yet. Solid caution pairs white with yellow at under 2:1, so never use it for text.

### Status map

`StatusBadge` (`components/ui/status-badge.tsx`) maps the literal API word to an intent. The badge fill is `color-background-{intent}-soft-alpha` and its text is the stronger `color-text-{intent}-surface`.

| Status                        | Intent    | Class     | Fill          | Text      |
| ----------------------------- | --------- | --------- | ------------- | --------- |
| `open`                        | `info`    | `info`    | `#0285ff 13%` | `#004f99` |
| `filled`, `valid`, `approved` | `success` | `success` | `#04b84c 15%` | `#008635` |
| `pending`                     | `warning` | `warning` | `#fb6a22 16%` | `#b9480d` |
| `expired`, `rejected`         | `danger`  | `danger`  | `#fa423e 16%` | `#ba2623` |

`danger` also marks any action that takes something away. A cancelled shift reopens, so it reads `open`: there is no cancelled badge.

### Borders

| Token                                | Value                   | Utility           | Use                                   |
| ------------------------------------ | ----------------------- | ----------------- | ------------------------------------- |
| `color-border-subtle`                | `#0000000d` (5%)        | `border-subtle`   | Rules between table rows              |
| `color-border`                       | `#0000001a` (10%)       | `border-default`  | Separators, menu and popover dividers |
| `color-border-strong`                | `#00000026` (15%)       | `border-strong`   | The inset ring on every field         |
| `color-border-disabled`              | `#0d0d0d 6%`            | none              | Disabled fields                       |
| `color-border-primary-outline-hover` | `#0d0d0d 20%`           | none              | Field and outline button hover        |
| `shadow-hairline`                    | `0 0 0 0.5px #0000001a` | `shadow-hairline` | Half-pixel frames, a signature        |

Fields draw their border as an inset `box-shadow`, not `border`.

### Overlays

| Token                                  | Value                | Use                                                           |
| -------------------------------------- | -------------------- | ------------------------------------------------------------- |
| `modal-backdrop-background`            | `#0000004d`          | Modal and sheet backdrop (black 30%)                          |
| `menu-item-background-color`           | `#0d0d0d 8%`         | Highlighted menu, select and command item; active section row |
| `color-background-primary-ghost-hover` | `#0000000d`          | Ghost hover, section hover highlight                          |
| `alpha-08`, `alpha-12`, `alpha-16`     | `#0d0d0d` 8, 12, 16% | Scroll thumb at rest, hovered, dragged                        |
| `color-background-text-selection`      | `#afafaf66`          | `::selection`                                                 |

The top bar's live line uses `bg-icon-success` (`app-color-icon-success`, `#00a240`) for a current poll and `bg-icon-warning` (`app-color-icon-warning`, `#e25507`) while a poll is failing. Both are 6px dots beside a `type-text-xs` line.

### Contrast

Pairs below 4.5:1 stay exact from the spec and are named here. In the light theme these miss it: the `outline-danger` label (about 3.5:1), the filled, valid and approved badges (about 4:1), the pending badge (about 4.4:1), field error text (4.46:1) and disabled fields (3.15:1). Status never relies on hue alone, because the word is always present.

### Site

Pure white and black grounds, with neutrals as ink at fixed opacity: `site-color-primary-100` for body, `-60` for meta, `-12` for dividers, `-4` for secondary fills. `site-color-cta-fill` is the primary pill. These namespaced tokens live in `app/globals.css`; app surfaces do not apply them.

## Typography

**Faces.** The app uses the system stack (`font-sans`) everywhere and loads no web fonts, which is part of the feel. `font-mono` is for code and identifiers. `font-brand` (Inter, the artifact's `base-sans`) is for brand moments only. The site uses Inter for everything (`site-sans`, with `liga` and `calt` on), and `site-lf` for rare editorial accents.

**Sizes.** 16px for content, 14px for chrome. Headings at 600, and nothing relies on bold. Button labels are 14px at 500. The empty-state title is 24px at 400: calm, not bold.

Each style is the class `type-<style>`, an `@utility` in `app/globals.css`.

| Class                | Size / line | Weight | Tracking   | Use                                          |
| -------------------- | ----------- | ------ | ---------- | -------------------------------------------- |
| `type-heading-xl`    | 32/38       | 600    | `-0.025em` | Stat figures                                 |
| `type-heading-lg`    | 24/28       | 600    | `0`        | Screen titles                                |
| `type-heading-md`    | 20/26       | 600    | `0`        | `PageShell` title, sign-in card title        |
| `type-heading-sm`    | 18/26       | 600    | `0`        | `DialogTitle`, `SheetTitle`                  |
| `type-heading-xs`    | 16/24       | 600    | `0`        | Shift card title, error state title          |
| `type-text-lg`       | 18/29       | 400    | `0`        | Defined, little used                         |
| `type-text-md`       | 16/24       | 400    | `0`        | Content, the `body` default                  |
| `type-text-sm`       | 14/20       | 400    | `0`        | Chrome, card lines, descriptions             |
| `type-text-xs`       | 12/18       | 400    | `0.025em`  | Captions                                     |
| `type-small-caps-md` | 11/15       | 600    | `0.65px`   | The only uppercase, through `text-transform` |

Field controls are 16/24 (`fieldControl`). Field labels are 14/20 at 500, messages 12/18. `--font-heading-2xl` and up, `--font-text-2xs`, `--font-text-3xs` and `--font-small-caps-lg` exist as tokens with no class.

**Figures** use `tabular-nums` wherever digits line up. Numbers align right in tables and identifiers stay left. Counts use `toLocaleString()`. Dates and times stay in the sans face with `tabular-nums`. Machine-readable values (ids, paths, URLs, hashes) render in `font-mono`, and prose never does.

**Site sizes.** Body is 17px on 28px (`site-p1`), and 17px is the tell. Headings are 500 at every size with negative tracking, and grow linearly between 375px and 1440px viewports. The fluid properties are `--site-type-*` in the artifact's `components/bundle.css`.

## Layout

### Spacing

A 4px base (`--spacing`). Common steps are 4, 6, 8, 10, 12, 16, 20, 24 and 32. Prefer a parent's `gap` over child margins. `surfaceCard` takes its padding from the caller, and `p-4` (16px) is the standard. `PageShell` is `px-6 py-6` with a 24px gap.

### Control scale

One scale drives buttons, inputs and icon buttons. 36px is the workhorse. Use `control-size-*` for height, `control-gutter-*` for side padding, `control-icon-size-*` for the icon, `control-font-size-*` for the label and `control-radius-*` for the corner. Don't invent a height between steps.

The spec's pairing of each size, in px:

| Size  | Height | Gutter | Icon | Font | Radius |
| ----- | -----: | -----: | ---: | ---: | -----: |
| `4xs` |     20 |      6 |   14 |   12 |      4 |
| `3xs` |     22 |      6 |   14 |   12 |      4 |
| `2xs` |     24 |      8 |   16 |   14 |      4 |
| `xs`  |     26 |      8 |   16 |   14 |      4 |
| `sm`  |     28 |     10 |   18 |   14 |      4 |
| `md`  |     32 |     12 |   18 |   16 |      8 |
| `lg`  |     36 |     12 |   18 |   14 |      8 |
| `xl`  |     40 |     14 |   18 |   14 |      8 |
| `2xl` |     44 |     14 |   20 |   14 |     12 |
| `3xl` |     48 |     16 |   20 |   16 |     12 |

Gutter and size steps don't share names: `lg` is 36px tall with a 12px gutter, and that value is `control-gutter-md`. `control-gutter-lg` is 14px.

What ShiftPatch ships differs:

| Control                          |           Height | Gutter | Radius |
| -------------------------------- | ---------------: | -----: | ------ |
| `Button` `size="sm"`             |               28 |     12 | full   |
| `Button` `size="lg"` (default)   |               36 |     14 | full   |
| `Button` `size="xl"`             |               40 |     16 | full   |
| `Button` `size="icon"`           | 36 wide and tall |      0 | full   |
| `Button` `size="icon-sm"`        | 28 wide and tall |      0 | full   |
| `fieldControl`                   |               36 |     12 | 8      |
| `selectTrigger` `data-size="sm"` |               28 |     12 | 8      |

### Section shell

Each role gets one landing screen, inside the section shell: a 288px inset sidebar whose rows jump between sections of that screen, so every required test ID shows with no navigation. The section shell holds the sidebar and the main pane.

- **Rows.** Nurse: Open shifts, Your shifts, Credential, Scheduled hours. Agency: Your agency's shifts, Scheduled hours. Admin: Shift coverage, Credentials to review, Scheduled hours, Audit log.
- **Side.** The mark and ShiftPatch, a nav with active marker, hover highlight and text-only row buttons (36px), then the user's name and role with a ghost `sm` Sign out at the bottom.
- **Main.** A sticky top bar (52px, `height-toolbar`) with the screen title, then the sections. Mark the active row with `aria-current="location"`. An action-prompting count sits at the row's end.
- **Radius.** `--outer-radius` is 16 and `--inset` is 8, so rows and the main pane compute to 8.
- **Compact.** Below a 1000px container, the sidebar and wide-only parts hide and the compact header shows the mark, name, role and Sign out.
- **Action outcomes.** Success uses a Sonner toast below the top bar and closes after four seconds. Errors use an inline `NotificationBanner` beside the relevant controls, including the top bar and the agency post sheet. Both use `notification-banner`.

Don't turn rows into routes or add icons: rows read as text.

The spec's chat shell, a 52px rail, 288px sidebar and 768px thread column, stays in the tokens and isn't built.

### Site grid

A 1440px container, 24 to 32px page padding, 120px between sections and 24px grid gaps.

## Surface separation

Containers are flat in both themes. Use fills, spacing and crisp frames for separation; do not add drop shadows to cards, page panes, menus, selects, popovers, dialogs or sheets.

| Surface                           | Treatment                                                   |
| --------------------------------- | ----------------------------------------------------------- |
| Cards, sign-in card, section main | `surfaceCard` or `shadow-hairline`: a zero-blur 0.5px frame |
| Menus, selects, popovers          | `popupSurface` with `shadow-hairline`                       |
| Dialogs and sheets                | Elevated fill and backdrop, without a cast                  |
| Fields                            | Existing inset rings and keyboard-focus outlines            |

`shadow-hairline` is a crisp frame, not a drop shadow. `elevation-stroke` is also zero-blur; `elevation-composer-dark` is an inset-only ring. These tokens remain. Cast-shadow tokens and their aliases are deliberately excluded from the imported design system, including app/site and control-thumb shadows. Tailwind's default shadow and drop-shadow scales are disabled to prevent fallback casts.

## Shapes

### Radius

| Token         |  Value | Use                                                                                                                            |
| ------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------ |
| `radius-sm`   |    4px | File button, checkbox, table sort button                                                                                       |
| `radius-md`   |    6px | Same value as `tooltip-border-radius`, the tooltip                                                                             |
| `radius-lg`   |    8px | Inputs, select trigger, input group, tags field (`control-radius-lg`), and menu, select and command items (`menu-item-radius`) |
| `radius-xl`   |   12px | Banners, error state                                                                                                           |
| `radius-2xl`  |   16px | Cards, table frames, modals, sheets' inner edge (`modal-radius`), menus, select lists, popovers                                |
| `radius-3xl`  |   24px | Large frames and the sign-in card                                                                                              |
| `radius-full` | 9999px | Buttons, badges, switch track and thumb, tag chips, clear buttons, scroll thumb, calendar range ends                           |

`radius-xs` and `radius-2xs` (2), `radius-4xl` (32), `radius-token-row` (10), `app-shell-sidebar-popover-radius` (14) and `composer-radius` (28) are defined and unused. New radii land on existing steps.

The site uses `site-radius-sm` 4, `site-radius-md` 6.08 for card media, `site-radius-lg` 16, `site-radius-xl` 32 and `site-button-radius` 40 for every CTA. Full-bleed media stays square.

### Nesting

Tight nesting uses the outer radius minus the gap: `calc(var(--outer-radius) - var(--inset))`. Once the gap reaches about three quarters of the outer radius, size each layer on its own. An inner radius is never larger than its parent's, so a card ending in a full-width `xl` pill (20px curve) uses `radius-3xl`, which is why the sign-in card isn't `surfaceCard`.

`Button` and the section shell declare `--outer-radius` and `--inset`. `fieldControl` declares `--outer-radius`, and `FileField` adds `--inset`. `StatusBadge` reads them through `max(badge-radius-sm, outer - inset)`, so it nests concentrically in a tight parent and is a pill anywhere else. A 36px pill in a 16px card has an 18px curve, which bends the never-larger rule by 2px and is accepted. A button press shrinks its fill by a 1px inset, with the radius reduced to match.

## Components

The artifact groups its cards as below. Each name in **bold** is a card, and its README there gives the full spec. Product components and Patterns are the ShiftPatch build. App system and Site system are specs, not built.

### Foundations

| Card             | What it fixes                                                        | Here                   |
| ---------------- | -------------------------------------------------------------------- | ---------------------- |
| **ControlScale** | One size scale, 20 to 48px, for buttons, inputs and icon buttons     | Layout › Control scale |
| **Corners**      | The radius steps and the nesting rule                                | Shapes                 |
| **Elevation**    | Flat surfaces, crisp hairline frames and inset rings                 | Surface separation     |
| **IntentMatrix** | 8 intents by 6 variants, each a matched set of fill, text and border | Colors › Intents       |
| **Logo**         | Which file goes where                                                | Logo                   |
| **Motion**       | Basic, press, relaxed and moving, plus the site's durations          | Motion                 |

### Product components

Built for ShiftPatch and kept.

| Card / component        | File                      | Styles                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Button**              | `@ui/button`              | `buttonVariants` (variant, size)             | See below                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Field** (`FileField`) | `@ui/field`               | `fieldControl` and utilities                 | Credential documents, `credential-upload-input`. Text, date, time and select fields go through `@ui/forms`, which has no file config. An `error` replaces the `hint` and adds the 16px alert icon. See Field states                                                                                                                                                                                                                 |
| **StatusBadge**         | `@ui/status-badge`        | `badgeVariants` (intent)                     | Prints the status literally. `badge-size-sm` 20px, `badge-gutter-lg` 8px, 12px at 600, `badge-tracking-sm` 0.025em. Fill `color-background-{intent}-soft-alpha`, text `color-text-{intent}-surface`. A pill that nests down to `badge-radius-sm` in a tight parent. No cancelled badge, and no caution or discovery intent                                                                                                          |
| **NotificationBanner**  | `@ui/notification-banner` | `bannerVariants`                             | One inline outcome: `{ kind: "success" \| "error", message }`. Success is `role="status"` on `color-background-success-surface` with a `color-border-success-surface` inset ring. Error is `role="alert"` on the danger pair. Text 14/20 at 500, padding 12px by `control-gutter-md`, gap 8, `radius-xl`, 20px icon. `banner-in` rises 4px over `transition-duration-relaxed` on `cubic-enter`. Change the React `key` to replay it |
| **StateMessage**        | `@ui/state-message`       | `shimmerText`                                | `{ kind: "loading", label }`, `{ kind: "empty", title, body }` or `{ kind: "error", title, body, action }`. Loading is `role="status"` with a 2s shimmer. Empty is a 24px title over a `type-text-sm` body, 24 by 16 padding. Error is `role="alert"`, 16px padding, `radius-xl`, on `color-background-warning-surface`, and always takes an `outline-primary` Try again. Loading and empty add no frame of their own               |
| **ShiftRow** (page)     | `app/page.tsx`            | `ShiftLedger`, `ShiftRow`                    | One `surfaceCard` panel of day groups (`type-text-xs` "Sat 2026-10-03" head with Today, Tomorrow or Past date). Each row is an `<article>`, min 60px: sun or moon icon, "07:00 to 19:00 next day" and "12 scheduled hours", the role and who covers it, the `StatusBadge`, then actions. The date repeats in an sr-only prefix. Stacks below a 560px panel                                                                          |
| **SurfaceCard**         | `@ui/surface-card`        | `surfaceCard`                                | The shared flat surface: `radius-2xl`, `color-surface-card`, `shadow-hairline`. The caller adds `p-4`. No hover of its own. A card ending in a full-width `xl` button uses the sign-in card instead                                                                                                                                                                                                                                 |
| **DataTable**           | `@ui/datatable`           | utilities in `@ui/datatable` and `@ui/table` | Frame `radius-2xl`, `color-surface-card`, `shadow-hairline`. The last row has no bottom border. See Ported and `tables.md`                                                                                                                                                                                                                                                                                                          |
| **Icon**                | `@ui/icons`               | none                                         | See Iconography                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Sign-in                 | Page pattern              | See **SignInPattern**                        | A 384px column on the muted ground. See **SignInPattern**                                                                                                                                                                                                                                                                                                                                                                           |
| Section shell           | Page pattern              | See **SectionShellPattern**                  | See **SectionShellPattern** and Layout                                                                                                                                                                                                                                                                                                                                                                                              |
| Motion specimen         | CSS only                  | utilities in the specimen                    | `--motion-duration` and `--motion-curve` on each dot. See **Motion**                                                                                                                                                                                                                                                                                                                                                                |

**Button.** `variant`: `solid-primary` (default), `outline-primary`, `ghost-primary`, `solid-danger`, `outline-danger`. `size`: `sm` 28px, `lg` 36px (default), `xl` 40px, `icon` 36px square. `loading` sets `aria-busy` and `disabled`, hides the label while keeping its width, and shows a 16px spinner. `type` defaults to `button`. `buttonVariants({ variant, size })` returns the classes for an element that isn't a `Button`, as the calendar's nav buttons do.

- Hover swaps `--fill` to the `-hover` token. Outline variants also change the ring.
- Pressed uses the `-active` token and shrinks the fill by 1px over 80ms. `size="icon"` scales to 0.97 instead.
- Focus is 2px `color-ring`, offset 1px. Danger uses `color-ring-danger`, and ghost uses offset -1px.
- Disabled is 40% opacity with no pointer events. Loading dims the same way, and with reduced motion the spinner pulses.
- A button's content lays an icon beside text, 6px apart. Icons are 16px, or 20px in `size="icon"` and 16px in `size="icon-sm"`, the menu chevron beside a `sm` button.
- `solid-primary` is for the one action. The danger variants are only for actions that take something away from someone. Don't disable Claim shift for a lapsed credential: pressing it is how the nurse learns why. Don't use blue as the action.

### Ported

Base UI primitives (`@base-ui/react`), plus `cmdk` and `react-day-picker`, restyled onto this system's tokens with Tailwind utilities in each file. Overlays use Base UI's `data-starting-style` and `data-ending-style`, with no animation library.

| Component                                                                                                                                                                                                                                                                                                                                                         | Import              | Classes                                                                        | Notes                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modal**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogTrigger`, `DialogOverlay`, `DialogPortal`                                                                                                                                                                                         | `@ui/dialog`        | Tailwind utilities in `@ui/dialog`                                             | 448px wide, down to the viewport less 32px. `modal-radius` 16, 20px padding, no drop shadow. `DialogContent` draws a ghost icon Close unless `showCloseButton={false}`. Footer actions are right-aligned, 8px apart                                                                                                                 |
| **Sheet**: `Sheet`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`, `SheetTrigger`                                                                                                                                                                                                                                  | `@ui/sheet`         | Tailwind utilities in `@ui/sheet`                                              | `side`: `top`, `right` (default), `bottom`, `left`. `right` floats 8px in from the edges, 448px wide (the viewport less 16px when narrower), `radius-3xl` with `shadow-hairline` and no cast; below 640px it becomes a bottom sheet rounded on top. `left` is 75% wide up to 384px, and the edge sheets round their inner edge only |
| **Popover**: `Popover`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription`, `PopoverTrigger`                                                                                                                                                                                                                                                 | `@ui/popover`       | `PopoverContent`                                                               | 288px, 10px padding, `radius-2xl`, `shadow-hairline`                                                                                                                                                                                                                                                                                |
| **Menu**: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuTrigger`, `DropdownMenuPortal` | `@ui/dropdown-menu` | `menuItem`, `menuLabel`, `menuSeparator`, and utilities in `@ui/dropdown-menu` | Minimum 240px (`app-menu-min-width`), `radius-2xl`. Items are 36px, 16px icons, `menu-item-radius` 8. Highlight is `menu-item-background-color`. `variant="destructive"` turns an item `color-text-danger`                                                                                                                          |
| **Select**: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`                                                                                                                                                                            | `@ui/select`        | `selectTrigger`, `menuItem`, and utilities in `@ui/select`                     | Trigger `size`: `default` 36, `sm` 28. Aligned over its trigger, the list opens in place with no transition                                                                                                                                                                                                                         |
| **Tooltip**: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`                                                                                                                                                                                                                                                                                     | `@ui/tooltip`       | `TooltipContent`                                                               | The compact tooltip only: `#0d0d0d` fill, white 12/16 at 600, padding 4 by 8, radius 6. Default `side="top"`, `delay` 0. Use it for icon buttons, never to hide a label that could be visible                                                                                                                                       |
| **Switch**: `Switch`                                                                                                                                                                                                                                                                                                                                              | `@ui/switch`        | `switchVariants` and utilities in `@ui/switch`                                 | 32 by 19 on the `switch-*` tokens, thumb 13. `size="sm"` is 24 by 14. Checked is `#3a83f7`: it is not an action. For a setting that takes effect at once                                                                                                                                                                            |
| `Checkbox`                                                                                                                                                                                                                                                                                                                                                        | `@ui/checkbox`      | Tailwind utilities in `@ui/checkbox`                                           | 16px, `radius-sm`, a field's inset ring, navy when checked or indeterminate, with a larger hit area                                                                                                                                                                                                                                 |
| `Input`                                                                                                                                                                                                                                                                                                                                                           | `@ui/input`         | `fieldControl`                                                                 | The shared control, with a 16/24 value                                                                                                                                                                                                                                                                                              |
| `Textarea`                                                                                                                                                                                                                                                                                                                                                        | `@ui/textarea`      | `fieldControl` and utilities in `@ui/textarea`                                 | Grows with its text from a 64px minimum                                                                                                                                                                                                                                                                                             |
| `Label`                                                                                                                                                                                                                                                                                                                                                           | `@ui/label`         | Tailwind utilities                                                             | For a bare control. `FormInput` draws its own                                                                                                                                                                                                                                                                                       |
| `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, `InputGroupTextarea`                                                                                                                                                                                                                                                    | `@ui/input-group`   | Tailwind utilities in `@ui/input-group`                                        | One field frame around a borderless control and its addons, drawing every state on the frame                                                                                                                                                                                                                                        |
| `Separator`                                                                                                                                                                                                                                                                                                                                                       | `@ui/separator`     | Tailwind utilities in `@ui/separator`                                          | 1px `color-border`, horizontal or vertical                                                                                                                                                                                                                                                                                          |
| `ScrollArea`, `ScrollBar`                                                                                                                                                                                                                                                                                                                                         | `@ui/scroll-area`   | Tailwind utilities in `@ui/scroll-area`                                        | Any region that scrolls inside the page uses it, not raw `overflow-auto`. Vertical unless the caller overrides, as `Table` does                                                                                                                                                                                                     |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`                                                                                                                                                                                                                                                          | `@ui/table`         | `Table`                                                                        | Wraps the table in a horizontal `ScrollArea`. Passes props such as `data-testid` to the `<table>`                                                                                                                                                                                                                                   |
| `DataTable`, `DataTablePagination`, `ColumnDef`, `comparator`                                                                                                                                                                                                                                                                                                     | `@ui/datatable`     | utilities in `@ui/datatable` and `@ui/table`                                   | Sortable and controlled. Recipe in `tables.md`                                                                                                                                                                                                                                                                                      |
| `Pagination` and parts                                                                                                                                                                                                                                                                                                                                            | `@ui/pagination`    | `buttonVariants` and utilities in `@ui/pagination`                             | `PaginationLink` is a real `Button`, not an anchor: outline when active, ghost otherwise                                                                                                                                                                                                                                            |
| `HoldButton`                                                                                                                                                                                                                                                                                                                                                      | `@ui/hold-button`   | Tailwind utilities in `@ui/hold-button`                                        | Fires `onHold` after `holdMs` (default 2000), by pointer, Space or Enter. Releasing early cancels                                                                                                                                                                                                                                   |
| `PageShell`                                                                                                                                                                                                                                                                                                                                                       | `@ui/page-shell`    | `type-heading-md`                                                              | Page title with a 20px Hugeicons icon, then the body. For pages outside the section shell                                                                                                                                                                                                                                           |
| `Calendar`, `CalendarDayButton`                                                                                                                                                                                                                                                                                                                                   | `@ui/calendar`      | `buttonVariants` and utilities in `@ui/calendar`                               | Days are 32px icon buttons. A picked day fills navy on the button's own layer                                                                                                                                                                                                                                                       |
| `Command` and parts                                                                                                                                                                                                                                                                                                                                               | `@ui/command`       | Tailwind utilities in `@ui/command`                                            | A searchable list for popovers and dialogs. Backs `ComboboxInput`                                                                                                                                                                                                                                                                   |
| `useForm`, `FormInput`, `FormLabel`, and the configs `TextInput`, `TextareaInput`, `DateInput`, `TimeInput`, `CheckboxInput`, `MoneyInput`, `ComboboxInput`, `SelectInput`, `TagsInput`                                                                                                                                                                           | `@ui/forms`         | `fieldControl`, `selectTrigger`, and utilities in `@ui/forms`                  | One path for every form except file upload. Recipe in `forms.md`                                                                                                                                                                                                                                                                    |

Inside `Table`, cells are 14/20, rows at least 36px (`height-token-nav-row`), with a 14px gutter and `color-border-subtle` rules. The caption is weight 500 and headers 600, both `color-text-secondary`. Cells never wrap. A right-aligned column (`align: "right"` on `ColumnDef`) gets `text-right`. A missing value is a dash, passed by the caller as "—", never a zero or a blank. Dates and times stay left in a `tabular-nums` span.

### Field states

Shared by `fieldControl` and everything built on it (`selectTrigger`, `InputGroup`, `TagsInput`).

- **Default.** `color-background-control-opaque` fill, 1px inset `color-border-strong` ring, 36px tall, `control-radius-lg`.
- **Hover.** Ring `color-border-primary-outline-hover` with a wash of `alpha-02`. Invalid hover uses `color-background-danger-surface`.
- **Focus.** 2px `color-ring`, offset 1px. Invalid focus uses `color-ring-danger`.
- **Error.** Message in `color-text-danger` with the alert icon and a sentence, set through `aria-invalid`. Never red alone.
- **Disabled.** Transparent fill, `color-border-disabled` ring, `color-text-disabled` text.

For a select, use `SelectInput` or `@ui/select`.

### Iconography

Two sets, with different jobs. Every icon is decorative and sits beside words, or carries an `sr-only` label on an icon button.

**Three filled glyphs**, inlined from `@ui/icons` on `currentColor`. They carry state.

| Glyph             | viewBox | Where                                                                                          |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `CheckCircleIcon` | 20      | Success banner, 20px, `app-color-icon-success`                                                 |
| `AlertCircleIcon` | 20      | Error banner, 20px, `app-color-icon-error`. Field errors, 16px, inheriting `color-text-danger` |
| `ChevronDownIcon` | 16      | Unused in the shipped UI. `@ui/select` uses Hugeicons                                          |

They have no intrinsic size, so set one with a class or a parent rule, and keep `currentColor`.

**Hugeicons** for everything else in a control: `HugeiconsIcon` from `@hugeicons/react`, with the glyph from `@hugeicons/core-free-icons`.

```tsx
<HugeiconsIcon icon={Cancel01Icon} />
```

In use: `ArrowDown01Icon`, `ArrowUp01Icon`, `ArrowLeft01Icon`, `ArrowRight01Icon`, `ArrowUpDownIcon`, `SortingUpIcon`, `SortingDownIcon`, `Cancel01Icon`, `Tick02Icon`, `Search01Icon`, `MoreHorizontalIcon`, `UnfoldMoreIcon`, `Calendar03Icon`, `Clock01Icon`, `DollarCircleIcon`. Reuse one of these before adding another, and add an icon only when a screen needs it.

**Sizes** come from the component's CSS, not the icon: 14px (`control-icon-size-xs`) in clear buttons, tag chips, checkboxes and calendar captions; 16px (`control-icon-size-sm`) in buttons with text, menu, select and command items, addons and form icons; 20px (`control-icon-size-lg`) in icon buttons and `PageShell` titles. The spec's 18px step for buttons and menu items isn't used: shipped buttons and menus take 16px. Colour follows the text tier through `app-color-icon-primary`, `-secondary`, `-tertiary`, `-accent`, `-success`, `-warning` and `-error`, or the parent's `color`. Don't use an icon on its own where a word fits, and don't let colour alone carry meaning.

### Logo

Light files use `brand-navy` ink with `brand-teal` accents. `-dark` files have a teal calendar and a white wordmark, and go on any dark ground. Light files never go on a dark ground. Each file has fixed inks, so an `<img>` can't recolour it. Give it a real `width`, `height` and `alt`.

- `lockup-horizontal` is the default, for wide spaces such as a page header.
- `lockup` for square or centred spaces.
- `wordmark` when the mark already appears nearby.
- `mark` alone at small sizes, and as the favicon and app icon.

Files are in `public/brand/`, with the favicons, touch icon and `site.webmanifest` icons in `public/`. The Open Graph image is 1200 by 630 on `#fafafa`.

### Patterns

Each row is a card.

| Card                     | Screen     | Build with                                                                                                                                                                                                                                                                                                                                                                                      | Rules                                                                                                                                                                                                                                                                  |
| ------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SignInPattern**        | No session | the sign-in ground, a 384px column with the mark and ShiftPatch, the sign-in card (24px padding, `shadow-hairline`), a centred `type-heading-md` title and `type-text-sm` description, one error `NotificationBanner`, `TextInput` Email and Password, `Button` `size="xl"` `className="w-full"`, then a `type-text-xs` line                                                                    | Shown directly on `/`. The banner appears only after a failed attempt, reads "Invalid email or password" and doesn't say which field was wrong. No second solid action. No social sign-in, sign-up or forgotten-password link. Keep the card at `radius-3xl`           |
| **SectionShellPattern**  | All roles  | See Layout › Section shell                                                                                                                                                                                                                                                                                                                                                                      | A click scrolls the main pane, and the active row follows scroll. No routes, icons or charts                                                                                                                                                                           |
| **NurseShiftsPattern**   | Nurse      | Full-width Open shifts as a `ShiftLedger` with an All, Day, Night `SegmentedControl`. Your shifts uses the same ledger and sits beside Credential below it. The two sections stack under an 880px content width.                                                                                                                                                                                | A claimed row uses an `outline-danger` Hold to cancel button at the same size as Claim shift. A two-second hold cancels with reason `advance` and reopens the shift. Claim shift stays enabled for a lapsed credential, turns outline, and the banner explains         |
| **PostShiftPattern**     | Agency     | The top bar's solid Post a shift opens a right `Sheet`: a `lg` block `SegmentedControl` Role, a 7-day date strip with Pick another date (`Calendar` in a `Popover`), Day, Night and Custom hour cards, two 24-hour text fields for Custom, then a pinned footer with the banner, the review line and an `xl` full-width Post shift                                                              | Valid defaults (RN, tomorrow, 07:00 to 19:00), so two clicks post. Typing 7, 700 or 0700 becomes 07:00 on blur. Past dates and duplicates warn and never block. On success the sheet closes, the new row is tinted for 5s and focus returns to Post a shift            |
| **AgencyCancelPattern**  | Agency     | On a filled `ShiftRow`: an `outline-danger` `sm` Cancel shift and an `icon-sm` ghost chevron opening a `DropdownMenu` "Cancel with a reason" (Cancelled in advance, No-show)                                                                                                                                                                                                                    | Cancel shift cancels in advance in one click; each menu item cancels at once, so no reason hides in a preselected value. Focus returns to the reopened row if visible, or to the selected filter if the row is hidden. The reason and previous nurse go to the audit log, and the shift reopens as `open`                                    |
| **CredentialPattern**    | Nurse      | One `surfaceCard` with Hugeicons headings for Current credential and Renewal. Show the current credential's approved expiry first. Show the renewal's filename, review status and proposed expiry separately.                                                                                                                                                                                   | The renewal disclosure contains the native date and file fields. Open it by default when a nurse needs to upload a credential. After a successful upload, collapse it and focus Replace upload. Keep the demo hint and the inline recovery action for a blocked claim. |
| **AdminCoveragePattern** | Admin      | Two stats in a row (`.surface-card p-4`: `type-text-sm` label and `StatusBadge`, `type-heading-xl tabular-nums` figure, `type-text-xs` caption), then Shift coverage with an All, Open, Filled `SegmentedControl` over a table with Agency, Role, Date, Times, Covering nurse and Status. The audit log adds a hint, an All, Shifts, Credentials, Blocked filter and an icon before each action | Refreshes on its own within five seconds and never animates; the top bar says "Updated just now". Filters narrow rows inside the table, which never unmounts. No nurse shows a dash. Table cells keep the plain `2026-10-03` and `19:00 to 07:00`. No charts           |
| **TimesheetPattern**     | All roles  | A table captioned Timesheet with Nurse, Agency, Date, Times and Scheduled hours, the last `align: "right"`                                                                                                                                                                                                                                                                                      | Filled shifts only. An admin sees every row, an agency its own shifts, a nurse their own. Never plain "Hours". An overnight 19:00 to 07:00 counts as 12. No approval, clock-in or payroll                                                                              |

`SegmentedControl` (in `app/page.tsx`, its one importer) is native radios on a `segmented-control-background` pill: 2px padding and gap, a `segmented-control-thumb-background` thumb framed by `shadow-hairline` that slides with Basic and `ease-move`, faces 28px (`lg` 32px) at 600. The sheet's date strip and hour cards reuse the same radios: the strip is seven 52px faces on a `radius-xl` track, and each hour card is 56px at `radius-xl` with a 16px dot that fills to a 5px navy ring when picked.
| **AuditLogPattern** | Admin | A table captioned Audit log with Time (in `tabular-nums`), Actor, Action, Record, Reason and Previous nurse, newest first | Read-only with no row actions. Reason and Previous nurse are set by cancellations (FR-6.6), otherwise a dash. A null actor (seed reset) reads System. Blocked claims are logged too. The log survives an operator seed reset and records it. Never shown to a nurse or an agency |

Test IDs follow SPEC NFR-1 and are listed in `docs/ShiftPatch-Technical-Spec.md`.

### App system (spec, not built)

Specs for the pieces ShiftPatch leaves out. Don't build one until a screen needs it, and read its card first. The tokens that exist for them stay in `app/globals.css`.

| Card               | What it is                                                                     | Why it's left out                                                         |
| ------------------ | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Composer**       | The prompt pill, 768px at most, with a crisp frame, `composer-radius` 26 or 28 | Nothing in ShiftPatch is a conversation                                   |
| **Messages**       | A 768px chat thread: user bubble, assistant text, code block, actions          | Same                                                                      |
| **Sidebar**        | A 52px icon rail and a 288px history panel on the shell ground                 | Each role has one landing screen. ShiftPatch uses **SectionShellPattern** |
| **ModeToggle**     | A 36px Chat and Work pill of two 112px segments                                | It belongs to that rail and top bar                                       |
| **UnreadCount**    | An 18px blue count at a nav row's end                                          | Same                                                                      |
| **Badge**          | `.spec-badge`: 20, 22 or 24px, soft or solid, 8 intents                        | `StatusBadge` covers every label in the product                           |
| **Tooltip** (rich) | `.tip-rich`, 14px, at most 260px, sm, md or lg padding                         | Nothing needs a title and a sentence                                      |
| Charts             | No card                                                                        | Reporting stops at the open and filled counts                             |
| Dark mode          | No card. The dark values are in `tokens.json`                                  | One theme, so no toggle                                                   |

**Modal**, **Menu**, the compact **Tooltip** and **Switch** also have cards marked not built. The code ports them anyway (`@ui/dialog`, `@ui/dropdown-menu`, `@ui/tooltip`, `@ui/switch`), as listed under Ported. Agency cancellation is one click, and selects cover role and cancel reason.

### Site system (spec, not built)

One system per surface, and this is a product, so none of these is built. Keep them off product screens. Each takes `site-` tokens from the artifact.

| Card            | What it is                                                                                   |
| --------------- | -------------------------------------------------------------------------------------------- |
| **SiteButton**  | The `.cta` pill (primary, secondary, media-solid, media-glass, text) and the 40px `.iconbtn` |
| **SiteHeader**  | A transparent 64px bar, 54px with no desktop nav below 1020px                                |
| **SiteHero**    | Full-bleed square-corner media with a centred white title and one CTA                        |
| **SiteSection** | A title row, a card grid, then 120px of air                                                  |
| **SiteCard**    | Feature 4-up, list 2-up and story 3-up cards. The media carries the shape                    |
| **SiteProse**   | The 1088px article column, 17/28 body, code and diffs                                        |
| **SiteFooter**  | Five link columns and a bottom row at one 13px size                                          |

## Motion

Quick and purposeful. Lists and polled data never animate. No bounce and no spring.

| Name   | Duration                            | Curve                 | Use                                                                                                                                          |
| ------ | ----------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic  | `transition-duration-basic` 150ms   | `ease-basic` (`ease`) | Colour, opacity and state. Backdrops, tooltip, menu, select and popover fades                                                                |
| Press  | 80ms, a literal                     | `ease-enter-snappy`   | The button fill shrinking on press, the icon button's scale                                                                                  |
| Arrive | `transition-duration-relaxed` 300ms | `cubic-enter`         | Banner, sign-in card and post form arriving. Sections rising once after sign-in with `animate-rise-in`, 50ms apart. Modal and sheet entrance |
| Scale  | 150ms                               | `cubic-enter`         | Floating panels scale from 0.97 at their anchor, with `transform-origin` from Base UI                                                        |
| Move   | 150ms or 300ms                      | `cubic-move`          | Anything changing position: section hover at 150ms, its active marker at 300ms, the switch thumb at 150ms                                    |
| Leave  | 150ms                               | `ease-basic`          | The sheet's exit. It slides 40px on the way in and out                                                                                       |
| Hold   | `--hold-duration`, linear           | linear                | `HoldButton`'s fill wipe, set inline from `holdMs`. It snaps back at Basic                                                                   |

Other curves are defined and unused: `cubic-exit`, `cubic-exit-snappy`, `ease-in-out`, `ease-out`.

- **Hover** goes inside `@media (hover: hover) and (pointer: fine)`. `app/globals.css` also redefines Tailwind's `hover:` variant to do this.
- **Overlays.** Base UI sets `data-starting-style` and `data-ending-style`. Transition from those, and don't add `tw-animate-css` or `animate-in` classes.
- **Reduced motion.** Movement stops and fades stay. With `motion-reduce:` variants, the button press only recolours, `size="icon"` doesn't scale, floating panels and `SheetContent` only fade, the switch thumb, motion specimen and active marker jump, hover highlight only fades, `HoldButton`'s fill fades instead of wiping, `NotificationBanner` and `animate-rise-in` use `fade-in`, and the spinner and `shimmerText` pulse. A new moving rule gets a line there.
- **Site.** Links dim to `site-color-primary-60` rather than underlining. Card images scale to 1.02 over 300ms. Durations run fast 100ms, short 200ms, medium 300ms and long 400ms.

## Responsive

- **Breakpoints** are Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). `app/globals.css` doesn't override them.
- **Section shell** responds to its container, not the viewport: `@container section-shell (max-width: 999px)` hides the sidebar, drops the main pane's inset, radius and hairline frame, and shows the compact header.
- **Tables** scroll sideways inside their own frame and never push the page. Don't drop columns.
- **Overlays.** `DialogContent` is `min(100% - 32px, 448px)`. Side sheets are 75% wide, up to 384px. Floating panels cap at `--available-height` and scroll through `ScrollArea`.
- **Shift cards.** The action wraps below the text when space runs out, with a 24px column gap and a 12px row gap.
- **Sign-in** keeps a 384px column inside `32px 24px` of ground padding.

## Content fundamentals

Plain words for people working to a short deadline. Say what happened in as few words as it takes.

| When              | Say                                    |
| ----------------- | -------------------------------------- |
| Claim succeeds    | Shift claimed                          |
| Credential lapsed | Credential expired, cannot claim shift |
| Sign-in fails     | Invalid email or password              |
| Timesheet column  | Scheduled hours                        |
| Nothing to show   | No open shifts right now               |
| Load fails        | Couldn't load shifts                   |

- **Status words** stay exactly as the API sends them: `open`, `filled`, `valid`, `expired`, `pending`, `approved`, `rejected`. A cancelled shift reopens, so it reads `open`. There is no cancelled badge.
- **Casing.** Sentence case for titles and buttons. Uppercase only through the `small-caps-*` styles.
- **Buttons** are verbs with their object: Claim shift, Post shift, Submit for review, Cancel shift.
- **Dates and times** read `2026-10-03` and `07:00 to 19:00`, in 24-hour facility-local time, set in tabular numerals.
- **Hours** are labelled scheduled, because nobody clocks in. An overnight 19:00 to 07:00 counts as 12 hours.
- **No emoji.** State is a word plus an icon or a badge tone.
- **Errors** say what happened. A load failure offers an `outline-primary` Try again in `StateMessage`.

## Where the spec and the code differ

The artifact is the wider spec. The shipped code wins on APIs and on what's built, and `tokens.json` wins on retained token values; drop-shadow tokens are intentionally excluded.

- **Overlays.** The **Modal**, **Menu**, **Tooltip** and **Switch** cards say not built. `components/ui/` ports all four, plus `Select`, `Popover` and `Sheet`.
- **Dark segmented control.** `segmented-control-background` is almost the same as the dark `color-surface`, so only the thumb reads.
- **Segmented control type.** The design canvas sets the default face at 13px/20px, which is between `type-*` steps; `SegmentedControl` keeps 13px, and its `lg` face uses `type-text-sm`. Its thumb takes `shadow-hairline` rather than the canvas's `segmented-control-thumb-shadow`, which the flat-surface policy leaves out.
- **Dates in tables.** The design canvas writes table dates as "Sat 2026-10-03" and overnight times with "next day". Tables keep the plain `2026-10-03` and `19:00 to 07:00` that the specs pin; the weekday lives in the ledger's day head and "next day" in ledger rows and the sheet.
- **Button.** The spec gives radii of 4 to 12px by size, gutters of 10, 12 and 14, and soft and surface variants. The shipped `Button` is always a pill, with gutters of 12, 14 and 16, and five variants. The spec's recipe is `.btn.solid-primary`, the code's is `Button` with `variant="solid-primary"`. Button icons are 16px, not the spec's 18.
- **Badge.** The spec's small badge has 5px padding, a 2px radius and `-soft` text. The shipped `StatusBadge` has 8px padding, a pill radius and `-surface` text, so 12px labels stay readable.
- **Modal.** The spec's `.modal-dialog` confirm is about 380px wide, and form dialogs use `radius-3xl`. `DialogContent` is 448px at `modal-radius`, with a Close icon by default. Its title is `type-heading-sm` and its body `type-text-sm text-secondary`, as specified.
- **Menu.** The spec's `.mi-panel` gives three gutters. `@ui/dropdown-menu` uses 6px around the items and `app-menu-item-padding` inside them, with 16px icons rather than 18.
- **Flat surfaces.** The app intentionally omits the artifact’s cast-shadow tokens and recipes. Popovers, menus and selects use a crisp hairline; cards and panes keep their frame; dialogs and sheets rely on their fill and backdrop.
- **Tooltip.** The spec has compact and rich, and defines no placement or delay. Only compact is ported, on top with a 0 delay. `.tip-compact` became `TooltipContent`.
- **Switch.** The spec's `aria-checked` styling became Base UI's `data-checked`. `size="sm"` isn't in the spec: it reuses `control-size-2xs` and `control-icon-size-xs`. `switch-track-color-hover` equals the resting colour.
- **Select.** The spec's screens use native selects. `@ui/select` and `SelectInput` are Base UI, so a test clicks the trigger and an option rather than calling `selectOption`.
- **DataTable.** The original `caption`, `rows` and `cell` API became `ColumnDef`, `columnOrder`, `rows` with `contents`, `emptyMessage`, `sort` and `onSortChange`. It has no `caption` prop. A table with a required test ID (`timesheet-table`, `audit-log-table`, `admin-dashboard-shift-table`) passes `data-testid`, which reaches the `<table>`.
- **Scrollbars.** `Table`'s `ScrollArea` draws the visible scrollbar thumb.
- **Motion.** The spec gives `(.4, 0, .2, 1)` as the default curve, while the code uses `ease` for Basic.
- **Logo.** The spec's advice for a mark asks for one `currentColor` fill. The shipped files have fixed colours.
- **Names to watch.** `color-surface-elevated-secondary` is white, while `app-color-background-elevated-secondary` is `#f3f3f3`. `color-background-primary-soft` is white, while `color-background-primary-soft-alpha` is `#f3f3f3`. `--text-*` and `--radius-*` are declared twice, in `@theme inline` and `:root`.
- **Brand hues.** `brand-navy` (`#0a2646`) and `brand-teal` (`#03b4ba`) are in `tokens.json`. `app/globals.css` retains these brand variables; components still use semantic tokens such as `color-background-primary-solid`.

## Complete token foundation

- **Source coverage.** `app/globals.css` retains the 14 token families from the artifact’s `tokens.json`: color, spacing, radius, shadow, size, layout, font size, font weight, line height, letter spacing, duration, easing, animation and component metrics. It also includes font families and all 39 named typography styles. The bundle supplies supplemental site hue ramps and app/fluid site typography properties. JSON wins on overlapping retained values; local-only tokens remain. Cast-shadow definitions and aliases are excluded by the flat-surface policy. Do not import the bundle’s component selectors or font imports.
- **Namespaces and utilities.** Site tokens retain `site-`; app surfaces keep their app tokens. Existing semantic aliases remain compatible. Shared size, gutter, icon, radius and easing scales are complete; the shadow namespace exposes only crisp frames and inset rings, with isolated site color/spacing/font utilities. Component-specific tokens remain accessible through CSS-variable utilities. Typography uses `type-<style>`, including `type-site-*`; unused animation specifications remain raw tokens without invented keyframes.
- **Dark values.** Source-defined overrides live under `:root[data-theme="dark"]`. No OS preference activates them and no product toggle exists. Light remains the shipped default.
- **Fonts.** Site font stacks are retained as tokens without loading web fonts or applying them to app surfaces. LF Serif is commercial; its source stack falls back to Source Serif 4. The app keeps its system font and needs no font files.
- **Computed values.** `tokens.json` writes `color-mix(in oklab, #hex N%, transparent)` as the same hex with alpha. `switch-thumb-size` is 13px and `leading-dense` 1.1667.

## Stop and ask

A value not in the tokens, such as a new radius or grey, is drift. Ask before adding it, reach for an existing semantic token first, and land new radii on existing steps. Never reference a primitive ramp from a component.

Layout literals in the ported classes are the accepted exceptions: 448px for the modal, 0.97 for the panel scale, and multiples of `--spacing`.

### Field rendering details

Empty controls use `placeholder-shown:text-sm` so the native placeholder shares the control’s font metrics and centers vertically. Entered text retains the 16px content size. Fine-pointer hover uses a background gradient with the `alpha-02` token, behind the inset border; an invalid hovered field clears that image and uses the danger surface. Focus and disabled states retain their own precedence.
