# Design System

## Overview

ShiftPatch covers open nursing shifts in real time: agencies post, credentialed nurses claim, and administrators see who covers what. The interface is near-monochrome ink on a quiet ground, with navy on the one action and every other colour reporting a shift or a credential.

**Principles**

- **The action is navy.** One solid action per view: Claim shift, Post a shift, Sign in. The label is always white.
- **Colour reports status.** Open, filled, valid, expired, pending. Everything that is not a status stays ink, and the word always sits beside the colour.
- **Coverage reads at a glance.** An administrator scans who covers what: two stat cards, then the coverage table. Figures line up in columns, and a missing nurse is a dash, never a blank.
- **Blocked is explained.** A nurse with a lapsed credential can still press Claim shift. The banner says why it failed, so nothing is quietly hidden.

**Where things live**

- Tokens and component classes are in `app/globals.css`. Values sit in `:root`, `@theme inline` maps names to Tailwind utilities, and `@layer components` holds the classes (`.btn`, `.field-control`, `.dialog-popup`). There is no `tailwind.config.*`.
- The product ships one light theme. `:root` has `color-scheme: light`, and there are no `dark:` classes.
- Shared UI is flat in `components/ui/`, imported as `@ui/<name>`. `cn` is `@lib/utils`.
- `DESIGN-SYSTEM.md` at the repo root is the wider spec this system came from. The design artifact (https://claude.ai/artifact/7ZeR3z5DNXgWyUQKD56WbK) renders it, including everything marked not built.
- Authority: `app/globals.css` wins on a value, shipped code wins on how a ShiftPatch screen behaves, and this file wins on intent. Fix the loser in the same change. A token added or changed in `app/globals.css` is documented here in the same diff.

## Colors

Use semantic tokens, never raw hex or a primitive ramp (`--gray-*`, `--blue-*`). Hue ramps are for illustration only. Names below drop the leading `--`.

### Surfaces

The ground is off-white, never pure white. Anything floating or typed into is pure white, and a soft shadow carries the jump, not a border.

| Token                                     | Value     | Utility                 | Use                                                                 |
| ----------------------------------------- | --------- | ----------------------- | ------------------------------------------------------------------- |
| `color-surface`                           | `#fcfcfc` | `bg-surface`            | The ground, the section shell's main pane                           |
| `color-surface-tertiary`                  | `#f9f9f9` | `bg-surface-tertiary`   | Table row hover, table footer                                       |
| `app-color-background-shell`              | `#f9f9f9` | `bg-shell`              | Shell ground in the spec                                            |
| `app-color-background-elevated-secondary` | `#f3f3f3` | `bg-elevated-secondary` | Muted ground behind the sign-in card and the section shell          |
| `color-surface-card`                      | `#ffffff` | `bg-card`               | `.surface-card`, sign-in card, table frame                          |
| `color-surface-elevated`                  | `#ffffff` | `bg-elevated`           | Modal, sheet, menus, select list, popover, command                  |
| `color-background-control-opaque`         | `#ffffff` | `bg-control`            | Inputs, select trigger, checkbox, tags field                        |
| `color-background-secondary-soft`         | `#f3f3f3` | none                    | File button, tag chips, the calendar's today and selected-range day |

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

The hue comes from the logo's navy. **Blue is never the primary button.** `color-ring`, links, the `open` status and the checked switch are its only jobs.

**The utility trap.** The theme maps `--color-primary` to text ink, so `bg-primary` is `#0d0d0d`, not navy. `bg-secondary` is `#5d5d5d` and `bg-accent` is `#2c67c5`, both text colours. The action is `.btn-solid-primary`, or `bg-primary-solid` with `text-on-primary-solid`. Shadcn names such as `text-muted-foreground`, `bg-popover` and `border-input` generate nothing here. See `tailwind.md`.

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

| Status                        | Intent    | Class            | Fill          | Text      |
| ----------------------------- | --------- | ---------------- | ------------- | --------- |
| `open`                        | `info`    | `.badge-info`    | `#0285ff 13%` | `#004f99` |
| `filled`, `valid`, `approved` | `success` | `.badge-success` | `#04b84c 15%` | `#008635` |
| `pending`                     | `warning` | `.badge-warning` | `#fb6a22 16%` | `#b9480d` |
| `expired`, `rejected`         | `danger`  | `.badge-danger`  | `#fa423e 16%` | `#ba2623` |

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

### Contrast

Pairs below 4.5:1 stay exact from the spec and are named here. In the light theme these miss it: the `outline-danger` label (about 3.5:1), the filled, valid and approved badges (about 4:1), the pending badge (about 4.4:1), field error text (4.46:1) and disabled fields (3.15:1). Status never relies on hue alone, because the word is always present.

## Typography

**Faces.** The app uses the system stack (`font-sans`) everywhere and loads no web fonts, which is part of the feel. `font-mono` is for code and identifiers. `font-brand` (Inter) is for brand moments only.

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

Field controls are 16/24 (`.field-control`). Field labels are 14/20 at 500, messages 12/18. `--font-heading-2xl` and up, `--font-text-2xs`, `--font-text-3xs` and `--font-small-caps-lg` exist as tokens with no class.

**Figures** use `tabular-nums` wherever digits line up. Numbers align right in tables and identifiers stay left. Counts use `toLocaleString()`. Dates and times stay in the sans face with `tabular-nums`. Machine-readable values (ids, paths, URLs, hashes) render in `font-mono`, and prose never does.

## Layout

### Spacing

A 4px base (`--spacing`). Common steps are 4, 6, 8, 10, 12, 16, 20, 24 and 32. Prefer a parent's `gap` over child margins. `.surface-card` takes its padding from the caller, and `p-4` (16px) is the standard. `PageShell` is `px-6 py-6` with a 24px gap.

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

| Control                            |           Height | Gutter | Radius |
| ---------------------------------- | ---------------: | -----: | ------ |
| `Button` `size="sm"`               |               28 |     12 | full   |
| `Button` `size="lg"` (default)     |               36 |     14 | full   |
| `Button` `size="xl"`               |               40 |     16 | full   |
| `Button` `size="icon"`             | 36 wide and tall |      0 | full   |
| `.field-control`                   |               36 |     12 | 8      |
| `.select-trigger` `data-size="sm"` |               28 |     12 | 8      |

### Section shell

Each role gets one landing screen, inside the section shell: a 288px inset sidebar whose rows jump between sections of that screen, so every required test ID shows with no navigation. `.section-shell` holds `.section-side` and `.section-main`.

- **Rows.** Nurse: Open shifts, Your shifts, Credential, Scheduled hours. Agency: Your agency's shifts, Scheduled hours. Admin: Shift coverage, Credentials to review, Scheduled hours, Audit log.
- **Side.** The mark and ShiftPatch, a `.section-nav` with `.section-marker`, `.section-hover` and text-only `.section-row` buttons (36px), then the user's name and role with a ghost `sm` Sign out at the bottom.
- **Main.** A sticky `.section-top` (52px, `height-toolbar`) with the screen title, then the sections. Mark the active row with `aria-current="location"`. An action-prompting count sits at the row's end.
- **Radius.** `--outer-radius` is 16 and `--inset` is 8, so rows and the main pane compute to 8.
- **Compact.** Below a 1000px container, `.section-side` and `.section-wide` hide and `.section-compact` shows the mark, name, role and Sign out.

Don't turn rows into routes or add icons: rows read as text. The product screens aren't built yet. `app/page.tsx` is still the template.

## Elevation

Depth is very quiet. Use a token, never a custom shadow. Keep shadows under about 12% alpha, except the modal.

| Level    | Token                     | Value                                                           | Use                                               |
| -------- | ------------------------- | --------------------------------------------------------------- | ------------------------------------------------- |
| Flat     | none                      | none                                                            | The ground, quiet rows                            |
| Hairline | `shadow-hairline`         | `0 0 0 0.5px #0000001a`                                         | Table frame, wells                                |
| Card     | `.surface-card`           | `shadow-hairline` plus `shadow-card` (`0 4px 16px 0 #0000000d`) | Shift cards, stats, credential rows, section main |
| Floating | `shadow-dropdown-overlay` | `0 0 0 0.5px #0000001a, 0 8px 16px -4px #0000001f`              | Menus, select list, popover                       |
| Modal    | `shadow-2xl`              | `0 16px 32px -8px #00000030`                                    | Modal, sheet                                      |

The switch thumb has its own `switch-thumb-shadow`. `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-tooltip`, `tooltip-box-shadow`, `elevation-composer` and `shadow-popover-overlay` are defined and unused. Utilities: `shadow-hairline`, `shadow-card`, `shadow-dropdown`, `shadow-composer`, and `shadow-sm` to `shadow-2xl`.

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

### Nesting

Tight nesting uses the outer radius minus the gap: `calc(var(--outer-radius) - var(--inset))`. Once the gap reaches about three quarters of the outer radius, size each layer on its own. An inner radius is never larger than its parent's, so a card ending in a full-width `xl` pill (20px curve) uses `radius-3xl`, which is why `.sign-in-card` isn't `.surface-card`.

`.btn` and `.section-shell` declare `--outer-radius` and `--inset`. `.field-control` declares `--outer-radius`, and `.field-file` adds `--inset`. `.badge` reads them through `max(badge-radius-sm, outer - inset)`, so it nests concentrically in a tight parent and is a pill anywhere else. A 36px pill in a 16px card has an 18px curve, which bends the never-larger rule by 2px and is accepted. A button press shrinks its fill by a 1px inset, with the radius reduced to match.

## Components

### Shipped

Built for ShiftPatch and kept.

| Component            | File                      | Classes                                                                                   | Notes                                                                                                                                        |
| -------------------- | ------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`             | `@ui/button`              | `.btn`, `.btn-{variant}`, `.btn-sm`, `.btn-xl`, `.btn-icon`, `.btn-label`, `.btn-spinner` | See below                                                                                                                                    |
| `FileField`          | `@ui/field`               | `.field`, `.field-label`, `.field-message`, `.field-control`, `.field-file`               | Credential documents, `credential-upload-input`. `FormInput` has no file config. An `error` replaces the `hint` and adds the 16px alert icon |
| `StatusBadge`        | `@ui/status-badge`        | `.badge`, `.badge-{intent}`, `.badge-label`                                               | Prints the status literally. 20px tall, 8px padding, 12px at 600                                                                             |
| `NotificationBanner` | `@ui/notification-banner` | `.banner`, `.banner-success`, `.banner-error`                                             | One inline outcome: `{ kind, message }`. Success is `role="status"`, error is `role="alert"`. Change the React `key` to replay the entrance  |
| `StateMessage`       | `@ui/state-message`       | `.shimmer`                                                                                | `{ kind: "loading" \| "empty" \| "error" }`. Error uses the warning surface and requires an `action`                                         |
| `ShiftCard`          | `@ui/shift-card`          | `.surface-card`                                                                           | `shift`, optional `detail` and `action`. The date line reads `2026-10-02, 19:00 to 07:00` in `tabular-nums`                                  |
| Icons                | `@ui/icons`               | none                                                                                      | See Iconography                                                                                                                              |
| Surface              | CSS only                  | `.surface-card`                                                                           | The one raised surface. No hover of its own                                                                                                  |
| Sign-in              | CSS only                  | `.sign-in-ground`, `.sign-in-card`, `.rise-in`                                            | A 384px column on the muted ground. See Screen patterns                                                                                      |
| Section shell        | CSS only                  | `.section-*`                                                                              | See Layout                                                                                                                                   |
| Motion specimen      | CSS only                  | `.motion-dot`, `.motion-toggle`                                                           | CSS specimen classes                                                                                                                         |

**Button.** `variant`: `solid-primary` (default), `outline-primary`, `ghost-primary`, `solid-danger`, `outline-danger`. `size`: `sm`, `lg` (default), `xl`, `icon`. `loading` sets `aria-busy` and `disabled`, hides the label while keeping its width, and shows a 16px spinner. `type` defaults to `button`. `buttonVariants({ variant, size })` returns the classes for an element that isn't a `Button`, as the calendar's nav buttons do.

- Hover swaps `--fill` to the `-hover` token. Outline variants also change the ring.
- Pressed uses the `-active` token and shrinks the fill by 1px over 80ms. `.btn-icon` scales to 0.97 instead.
- Focus is 2px `color-ring`, offset 1px. Danger uses `color-ring-danger`, and ghost uses offset -1px.
- Disabled is 40% opacity with no pointer events.
- `.btn-label` lays an icon beside text, 6px apart. Icons are 16px, or 20px in `.btn-icon`.
- `solid-primary` is for the one action. The danger variants are only for actions that take something away from someone. Don't disable Claim shift for a lapsed credential: pressing it is how the nurse learns why.

### Ported

Base UI primitives (`@base-ui/react`), plus `cmdk` and `react-day-picker`, restyled onto this system's tokens. Each file's own classes, all in `@layer components`. Overlays use Base UI's `data-starting-style` and `data-ending-style`, with no animation library.

| Component                                                                                                                                                                                                                                                                                                                                                         | Import              | Classes                                                                                                                                                                                                                                                                        | Notes                                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Modal**: `Dialog`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`, `DialogTrigger`, `DialogOverlay`, `DialogPortal`                                                                                                                                                                                         | `@ui/dialog`        | `.dialog-backdrop`, `.dialog-popup`                                                                                                                                                                                                                                            | 448px wide, down to the viewport less 32px. `modal-radius` 16, 20px padding, `shadow-2xl`. `DialogContent` draws a ghost icon Close unless `showCloseButton={false}`. Footer actions are right-aligned, 8px apart |
| **Sheet**: `Sheet`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`, `SheetTrigger`                                                                                                                                                                                                                                  | `@ui/sheet`         | `.sheet-backdrop`, `.sheet-popup`                                                                                                                                                                                                                                              | `side`: `top`, `right` (default), `bottom`, `left`. Side sheets are 75% wide, up to 384px. Rounded on the inner edge only                                                                                         |
| **Popover**: `Popover`, `PopoverContent`, `PopoverHeader`, `PopoverTitle`, `PopoverDescription`, `PopoverTrigger`                                                                                                                                                                                                                                                 | `@ui/popover`       | `.popover-popup`                                                                                                                                                                                                                                                               | 288px, 10px padding, `radius-2xl`, `shadow-dropdown-overlay`                                                                                                                                                      |
| **Menu**: `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`, `DropdownMenuGroup`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuTrigger`, `DropdownMenuPortal` | `@ui/dropdown-menu` | `.menu-popup`, `.menu-item`, `.menu-label`, `.menu-separator`, `.menu-shortcut`                                                                                                                                                                                                | Minimum 240px (`app-menu-min-width`), `radius-2xl`. Items are 36px, 16px icons, `menu-item-radius` 8. Highlight is `menu-item-background-color`. `variant="destructive"` turns an item `color-text-danger`        |
| **Select**: `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`                                                                                                                                                                            | `@ui/select`        | `.select-trigger` (on `.field-control`), `.select-popup`, `.select-item`, `.select-scroll-arrow`, and `.menu-label`, `.menu-separator`                                                                                                                                         | Trigger `size`: `default` 36, `sm` 28. Aligned over its trigger, the list opens in place with no transition                                                                                                       |
| **Tooltip**: `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`                                                                                                                                                                                                                                                                                     | `@ui/tooltip`       | `.tooltip-popup`                                                                                                                                                                                                                                                               | The compact tooltip only: `#0d0d0d` fill, white 12/16 at 600, padding 4 by 8, radius 6. Default `side="top"`, `delay` 0. Use it for icon buttons, never to hide a label that could be visible                     |
| **Switch**: `Switch`                                                                                                                                                                                                                                                                                                                                              | `@ui/switch`        | `.switch`, `.switch-thumb`                                                                                                                                                                                                                                                     | 32 by 19 on the `switch-*` tokens, thumb 13. `size="sm"` is 24 by 14. Checked is `#3a83f7`: it is not an action. For a setting that takes effect at once                                                          |
| `Checkbox`                                                                                                                                                                                                                                                                                                                                                        | `@ui/checkbox`      | `.checkbox`, `.checkbox-indicator`                                                                                                                                                                                                                                             | 16px, `radius-sm`, a field's inset ring, navy when checked or indeterminate, with a larger hit area                                                                                                               |
| `Input`                                                                                                                                                                                                                                                                                                                                                           | `@ui/input`         | `.field-control`                                                                                                                                                                                                                                                               | The shared control, with a 16/24 value                                                                                                                                                                            |
| `Textarea`                                                                                                                                                                                                                                                                                                                                                        | `@ui/textarea`      | `.field-control`, `.field-textarea`                                                                                                                                                                                                                                            | Grows with its text from a 64px minimum                                                                                                                                                                           |
| `Label`                                                                                                                                                                                                                                                                                                                                                           | `@ui/label`         | Tailwind utilities                                                                                                                                                                                                                                                             | For a bare control. `FormInput` draws its own                                                                                                                                                                     |
| `InputGroup`, `InputGroupAddon`, `InputGroupButton`, `InputGroupText`, `InputGroupInput`, `InputGroupTextarea`                                                                                                                                                                                                                                                    | `@ui/input-group`   | `.input-group`, `.input-group-addon`, `.input-group-button`, `.input-group-control`, `.input-group-text`                                                                                                                                                                       | One field frame around a borderless control and its addons, drawing every state on the frame                                                                                                                      |
| `Separator`                                                                                                                                                                                                                                                                                                                                                       | `@ui/separator`     | `.separator`                                                                                                                                                                                                                                                                   | 1px `color-border`, horizontal or vertical                                                                                                                                                                        |
| `ScrollArea`, `ScrollBar`                                                                                                                                                                                                                                                                                                                                         | `@ui/scroll-area`   | `.scroll-area-viewport`, `.scroll-area-scrollbar`, `.scroll-area-thumb`                                                                                                                                                                                                        | Any region that scrolls inside the page uses it, not raw `overflow-auto`. Vertical unless the caller overrides, as `Table` does                                                                                   |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption`                                                                                                                                                                                                                                                          | `@ui/table`         | `.data-table`                                                                                                                                                                                                                                                                  | Wraps the table in a horizontal `ScrollArea`. Passes props such as `data-testid` to the `<table>`                                                                                                                 |
| `DataTable`, `DataTablePagination`, `ColumnDef`, `comparator`                                                                                                                                                                                                                                                                                                     | `@ui/datatable`     | `.data-table-frame`, `.data-table-empty`, `.data-table-row-action`, `.data-table-sort-head`, `.data-table-sort`, `.is-numeric`                                                                                                                                                 | Sortable and controlled. Recipe in `tables.md`                                                                                                                                                                    |
| `Pagination` and parts                                                                                                                                                                                                                                                                                                                                            | `@ui/pagination`    | `.pagination-ellipsis`, `.btn` classes                                                                                                                                                                                                                                         | `PaginationLink` is a real `Button`, not an anchor: outline when active, ghost otherwise                                                                                                                          |
| `HoldButton`                                                                                                                                                                                                                                                                                                                                                      | `@ui/hold-button`   | `.hold-button-fill`                                                                                                                                                                                                                                                            | Fires `onHold` after `holdMs` (default 2000), by pointer, Space or Enter. Releasing early cancels                                                                                                                 |
| `PageShell`                                                                                                                                                                                                                                                                                                                                                       | `@ui/page-shell`    | `type-heading-md`                                                                                                                                                                                                                                                              | Page title with a 20px Hugeicons icon, then the body. For pages outside the section shell                                                                                                                         |
| `Calendar`, `CalendarDayButton`                                                                                                                                                                                                                                                                                                                                   | `@ui/calendar`      | `.calendar`, `.calendar-nav-button`, `.calendar-dropdown-root`, `.calendar-dropdown`, `.calendar-caption-label`, `.calendar-weekday`, `.calendar-day-button`, `.calendar-today`, `.calendar-outside`, `.calendar-range-start`, `.calendar-range-middle`, `.calendar-range-end` | Days are 32px icon buttons. A picked day fills navy on the button's own layer                                                                                                                                     |
| `Command` and parts                                                                                                                                                                                                                                                                                                                                               | `@ui/command`       | `.command`, `.command-dialog`, `.command-input-group`, `.command-input`, `.command-empty`, `.command-footnote`, `.command-group`, `.command-separator`, `.command-item`, `.command-item-check`, `.command-shortcut`                                                            | A searchable list for popovers and dialogs. Backs `ComboboxInput`                                                                                                                                                 |
| `useForm`, `FormInput`, `FormLabel`, and the configs `TextInput`, `TextareaInput`, `DateInput`, `TimeInput`, `CheckboxInput`, `MoneyInput`, `ComboboxInput`, `SelectInput`, `TagsInput`                                                                                                                                                                           | `@ui/forms`         | `.form-control-icon`, `.form-search-input`, `.form-time-input`, `.form-clear-button`, `.form-tags`, `.form-tags-input`, `.form-tag`, `.form-tag-remove`, `.form-popover-footer`                                                                                                | One path for every form except file upload. Recipe in `forms.md`                                                                                                                                                  |

Inside `.data-table`, cells are 14/20, rows at least 36px (`height-token-nav-row`), with a 14px gutter and `color-border-subtle` rules. The caption is weight 500 and headers 600, both `color-text-secondary`. Cells never wrap. A right-aligned column (`align: "right"` on `ColumnDef`) gets `.is-numeric`. A missing value is a dash, passed by the caller as "—", never a zero or a blank. Dates and times stay left in a `tabular-nums` span.

### Field states

Shared by `.field-control` and everything built on it (`.select-trigger`, `.input-group`, `.form-tags`).

- **Default.** `color-background-control-opaque` fill, 1px inset `color-border-strong` ring, 36px tall, `control-radius-lg`.
- **Hover.** Ring `color-border-primary-outline-hover` with a wash of `alpha-02`. Invalid hover uses `color-background-danger-surface`.
- **Focus.** 2px `color-ring`, offset 1px. Invalid focus uses `color-ring-danger`.
- **Error.** Message in `color-text-danger` with the alert icon and a sentence, set through `aria-invalid`. Never red alone.
- **Disabled.** Transparent fill, `color-border-disabled` ring, `color-text-disabled` text.

`.field-select` stays in `app/globals.css` for a wrapped native `<select>`, but has no React caller now that `SelectField` is gone. Use `SelectInput` or `@ui/select`.

### Iconography

Two sets, with different jobs. Every icon is decorative and sits beside words, or carries an `sr-only` label on an icon button.

**Three filled glyphs**, inlined from `@ui/icons` on `currentColor`. They carry state.

| Glyph             | viewBox | Where                                                                                          |
| ----------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `CheckCircleIcon` | 20      | Success banner, 20px, `app-color-icon-success`                                                 |
| `AlertCircleIcon` | 20      | Error banner, 20px, `app-color-icon-error`. Field errors, 16px, inheriting `color-text-danger` |
| `ChevronDownIcon` | 16      | No caller since `SelectField` went. `@ui/select` uses Hugeicons                                |

They have no intrinsic size, so set one with a class or a parent rule, and keep `currentColor`.

**Hugeicons** for everything else in a control: `HugeiconsIcon` from `@hugeicons/react`, with the glyph from `@hugeicons/core-free-icons`.

```tsx
<HugeiconsIcon icon={Cancel01Icon} />
```

In use: `ArrowDown01Icon`, `ArrowUp01Icon`, `ArrowLeft01Icon`, `ArrowRight01Icon`, `ArrowUpDownIcon`, `SortingUpIcon`, `SortingDownIcon`, `Cancel01Icon`, `Tick02Icon`, `Search01Icon`, `MoreHorizontalIcon`, `UnfoldMoreIcon`, `Calendar03Icon`, `Clock01Icon`, `DollarCircleIcon`. Reuse one of these before adding another, and add an icon only when a screen needs it.

**Sizes** come from the component's CSS, not the icon: 14px (`control-icon-size-xs`) in clear buttons, tag chips, checkboxes and calendar captions; 16px (`control-icon-size-sm`) in buttons with text, menu, select and command items, addons and form icons; 20px (`control-icon-size-lg`) in icon buttons and `PageShell` titles. Colour follows the text tier through `app-color-icon-*` or the parent's `color`. Don't use an icon on its own where a word fits, and don't let colour alone carry meaning.

### Screen patterns

No product screen is built yet. These are the specs.

| Pattern        | Screen     | Build with                                                                                                                                                                                                                    | Rules                                                                                                                                                     |
| -------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in        | No session | `.sign-in-ground`, a 384px column with the mark and ShiftPatch, `.sign-in-card`, a centred `type-heading-md` title, one error `NotificationBanner`, `TextInput` Email and Password, `Button` `size="xl"` `className="w-full"` | Shown directly on `/`. The banner reads "Invalid email or password". No social sign-in, sign-up or forgotten-password link. Keep the card at `radius-3xl` |
| Nurse shifts   | Nurse      | One `ShiftCard` per shift, 12px apart. Open takes a solid Claim shift, claimed takes an `outline-danger` Cancel shift                                                                                                         | Cancelling is one click with no confirmation. Claim shift stays enabled for a lapsed credential, and the banner explains                                  |
| Post shift     | Agency     | `SelectInput` Role (RN or LPN, default RN), `TextInput` `type="date"`, two `TextInput` `type="time"` in a two-column grid, and a full-width `Button`                                                                          | Opens inline, never in a modal. Valid defaults. An End earlier than Start means overnight, and its hint says so                                           |
| Agency cancel  | Agency     | `ShiftCard` with `detail="Covered by Maria Lopez"`. `action` holds a Reason select (advance or no-show, default advance) and an `outline-danger` Button, bottom-aligned                                                       | No modal and no menu. The reason and previous nurse go to the audit log, and the shift reopens as `open`                                                  |
| Credential     | Nurse      | `FileField` `accept=".pdf,.png,.jpg,.jpeg"`, `TextInput` `type="date"`, a Button, and two `.surface-card` rows with a `StatusBadge`                                                                                           | The expiry stays native so a test can fill it. An upload stays `pending` until an admin approves it, and changes nothing until then                       |
| Admin coverage | Admin      | Two stats in a row (`.surface-card p-4`: `type-text-sm` label and `StatusBadge`, `type-heading-xl tabular-nums` figure, `type-text-xs` caption), then a table with Agency, Role, Date, Times, Covering nurse and Status       | Refreshes on its own within five seconds and never animates. No charts                                                                                    |
| Timesheet      | All roles  | A table with Nurse, Agency, Date, Times and Scheduled hours, the last `align: "right"`                                                                                                                                        | Filled shifts only. Never plain "Hours". An overnight 19:00 to 07:00 counts as 12                                                                         |
| Audit log      | Admin      | A table with Time, Actor, Action, Record and Reason, newest first                                                                                                                                                             | Read-only with no row actions. Reason holds the cancellation reason, otherwise a dash                                                                     |

Test IDs follow SPEC NFR-1 and are listed in `docs/ShiftPatch-Technical-Spec.md`.

### Not built

Specified, with a rendition in the design artifact (https://claude.ai/artifact/7ZeR3z5DNXgWyUQKD56WbK). Don't build one until a screen needs it, and read its card there first. The tokens that exist for them stay in `app/globals.css`.

| Not built                  | Why                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Composer, chat messages    | Nothing in ShiftPatch is a conversation                                                                                                               |
| Icon rail, history sidebar | Each role has one landing screen. The section shell only jumps within it                                                                              |
| Mode toggle, unread count  | They belong to that rail and top bar                                                                                                                  |
| Radio, segmented control   | No either-or choice needs them yet                                                                                                                    |
| Generic badge              | `StatusBadge` covers every label in the product                                                                                                       |
| Rich tooltip               | The compact tooltip is ported. Nothing needs a title and a sentence                                                                                   |
| Charts                     | Reporting stops at the open and filled counts                                                                                                         |
| Marketing site system      | One system per surface. This is a product. Its `site-` tokens live only in the artifact                                                               |
| Dark mode                  | One theme, so no toggle. The artifact holds the dark values: near-black surfaces, teal action with a navy label, never a white label on teal (2.55:1) |

## Motion

Quick and purposeful. Lists and polled data never animate. No bounce and no spring.

| Name   | Duration                            | Curve                 | Use                                                                                                                                   |
| ------ | ----------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Basic  | `transition-duration-basic` 150ms   | `ease-basic` (`ease`) | Colour, opacity and state. Backdrops, tooltip, menu, select and popover fades                                                         |
| Press  | 80ms, a literal                     | `ease-enter-snappy`   | The button fill shrinking on press, the icon button's scale                                                                           |
| Arrive | `transition-duration-relaxed` 300ms | `cubic-enter`         | Banner, sign-in card and post form arriving. Sections rising once after sign-in with `.rise-in`, 50ms apart. Modal and sheet entrance |
| Scale  | 150ms                               | `cubic-enter`         | Floating panels scale from 0.97 at their anchor, with `transform-origin` from Base UI                                                 |
| Move   | 150ms or 300ms                      | `cubic-move`          | Anything changing position: section hover at 150ms, its active marker at 300ms, the switch thumb at 150ms                             |
| Leave  | 150ms                               | `ease-basic`          | The sheet's exit. It slides 40px on the way in and out                                                                                |
| Hold   | `--hold-duration`, linear           | linear                | `HoldButton`'s fill wipe, set inline from `holdMs`. It snaps back at Basic                                                            |

Other curves are defined and unused: `cubic-exit`, `cubic-exit-snappy`, `ease-in-out`, `ease-out`.

- **Hover** goes inside `@media (hover: hover) and (pointer: fine)`. `app/globals.css` also redefines Tailwind's `hover:` variant to do this.
- **Overlays.** Base UI sets `data-starting-style` and `data-ending-style`. Transition from those, and don't add `tw-animate-css` or `animate-in` classes.
- **Reduced motion.** Movement stops and fades stay. In the `prefers-reduced-motion` block, the button press only recolours, `.btn-icon` doesn't scale, floating panels and `.sheet-popup` only fade, `.switch-thumb`, `.motion-dot` and `.section-marker` jump, `.section-hover` only fades, `.hold-button-fill` fades instead of wiping, `.banner` and `.rise-in` use `fade-in`, and the spinner and `.shimmer` pulse. A new moving rule gets a line there.

## Responsive

- **Breakpoints** are Tailwind's defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536). `app/globals.css` doesn't override them.
- **Section shell** responds to its container, not the viewport: `@container section-shell (max-width: 999px)` hides the sidebar, drops the main pane's inset, radius and shadow, and shows `.section-compact`.
- **Tables** scroll sideways inside their own frame and never push the page. Don't drop columns.
- **Overlays.** `.dialog-popup` is `min(100% - 32px, 448px)`. Side sheets are 75% wide, up to 384px. Floating panels cap at `--available-height` and scroll through `ScrollArea`.
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

- **Status words** stay exactly as the API sends them: `open`, `filled`, `valid`, `expired`, `pending`, `approved`, `rejected`. A cancelled shift reopens, so it reads `open`.
- **Casing.** Sentence case for titles and buttons. Uppercase only through `type-small-caps-md`.
- **Buttons** are verbs with their object: Claim shift, Post shift, Submit for review, Cancel shift.
- **Dates and times** read `2026-10-03` and `07:00 to 19:00`, in 24-hour facility-local time, set in tabular numerals.
- **Hours** are labelled scheduled, because nobody clocks in.
- **No emoji.** State is a word plus an icon or a badge tone.
- **Errors** say what happened. A load failure offers an `outline-primary` Try again in `StateMessage`.

## Where the spec and the code differ

`DESIGN-SYSTEM.md` is the wider spec. The shipped code wins for ShiftPatch screens, and `app/globals.css` wins on any value.

- **Button.** The spec gives radii of 4 to 12px by size, gutters of 10, 12 and 14, and soft and surface variants. The shipped `.btn` is always a pill, with gutters of 12, 14 and 16, and five variants. The spec's recipe is `.btn.solid-primary`, the code's is `.btn-solid-primary`. Button icons are 16px, not the spec's 18.
- **Badge.** The spec's small badge has 5px padding, a 2px radius and `-soft` text. The shipped `.badge` has 8px padding, a pill radius and `-surface` text, so 12px labels stay readable.
- **Modal.** The spec's `.modal-dialog` confirm is about 380px wide, and form dialogs use `radius-3xl`. `.dialog-popup` is 448px at `modal-radius`, with a Close icon by default. Its title is `type-heading-sm` and its body `type-text-sm text-secondary`, as specified.
- **Menu.** The spec's `.mi-panel` gives three gutters. `@ui/dropdown-menu` uses 6px around the items and `app-menu-item-padding` inside them, with 16px icons rather than 18.
- **Popover.** The spec lifts popovers with `elevation-composer`. `.popover-popup` uses `shadow-dropdown-overlay`, like the menus.
- **Tooltip.** The spec has compact and rich, and defines no placement or delay. Only compact is ported, on top with a 0 delay. `.tip-compact` became `.tooltip-popup`.
- **Switch.** The spec's `aria-checked` styling became Base UI's `data-checked`. `size="sm"` isn't in the spec: it reuses `control-size-2xs` and `control-icon-size-xs`. `switch-track-color-hover` equals the resting colour.
- **Select.** The spec's screens use native selects. `@ui/select` and `SelectInput` are Base UI, so a test clicks the trigger and an option rather than calling `selectOption`.
- **DataTable.** The original `caption`, `rows` and `cell` API became `ColumnDef`, `columnOrder`, `rows` with `contents`, `emptyMessage`, `sort` and `onSortChange`. It has no `caption` prop. A table with a required test ID (`timesheet-table`, `audit-log-table`, `admin-dashboard-shift-table`) passes `data-testid`, which reaches the `<table>`.
- **Scrollbars.** `.data-table-frame` keeps its 4px-to-6px `::-webkit-scrollbar` thumb, but `Table`'s `ScrollArea` now draws the visible one, `.scroll-area-thumb`.
- **Shadows.** The spec says all shadows stay under 12% in one rule and under 19% in another. `shadow-2xl` is 19%, the only shadow in use above 12%.
- **Motion.** The spec gives `(.4, 0, .2, 1)` as the default curve, while the code uses `ease` for Basic.
- **Logo.** The spec's advice for a mark asks for one `currentColor` fill. The shipped files have fixed colours.
- **Names to watch.** `color-surface-elevated-secondary` is white, while `app-color-background-elevated-secondary` is `#f3f3f3`. `color-background-primary-soft` is white, while `color-background-primary-soft-alpha` is `#f3f3f3`. `--text-*` and `--radius-*` are declared twice, in `@theme inline` and `:root`.
- **Brand hues.** `brand-navy` (`#0a2646`) and `brand-teal` (`#03b4ba`) are artifact token names. `app/globals.css` has no such variables, so components use `color-background-primary-solid`, and teal lives only in the logo files.

## Stop and ask

A value not in the tokens, such as a new radius, grey or shadow, is drift. Ask before adding it, reach for an existing semantic token first, and land new radii on existing steps. Never reference a primitive ramp from a component.

Layout literals in the ported classes are the accepted exceptions: 448px for the modal, 0.97 for the panel scale, and multiples of `--spacing`.
