# Tailwind

Tailwind v4, configured in CSS: `app/globals.css` holds the tokens, and its `@theme inline reference` block maps them to utilities. There is no `tailwind.config.*`. Class merging goes through `cn()` in `lib/utils.ts` (`@lib/utils`). Primitives live in `components/ui/*`. See also `index.md` (routing) and `design-system.md` (visual spec).

- Use the semantic utilities the theme defines, never the primitive ramps or raw hex:

  | Job      | Utilities                                                                                      |
  | -------- | ---------------------------------------------------------------------------------------------- |
  | Surfaces | `bg-surface`, `bg-surface-tertiary`, `bg-card`, `bg-elevated`, `bg-control`                    |
  | Text     | `text-primary`, `text-secondary`, `text-tertiary` (placeholders only), `text-accent`           |
  | Intents  | `text-danger`, `text-success`, `text-warning`, `text-info`, `bg-danger-soft`, and so on        |
  | Borders  | `border-default`, `border-strong`, `border-subtle`                                             |
  | Action   | `bg-primary-solid`, `text-on-primary-solid`                                                    |
  | Type     | `type-heading-xl` to `type-heading-xs`, `type-text-lg` to `type-text-xs`, `type-small-caps-md` |
  | Other    | `font-mono`, `tabular-nums`, `shadow-hairline`, `rounded-lg`, `rounded-2xl`, `rounded-full`    |

- **The `bg-primary` trap.** The theme's `primary`, `secondary` and `accent` colors are text colors, so they exist as background utilities and paint the wrong thing. `bg-primary` is near-black and skips navy, `bg-secondary` is grey text color, and `bg-accent` is link blue. The navy action is `bg-primary-solid`, and in practice `<Button>` or `buttonVariants()`.
- **Names from other shadcn projects don't exist here.** `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted`, `bg-popover`, `border-input` and `bg-destructive` generate nothing, with no error. Use the table above.
- **Components use utilities.** Every component style is Tailwind utilities in its own file, built from `@theme` names (`h-control-lg`, `px-gutter-md`, `gap-input-sm`, `size-icon-sm`, `inset-ring-strong`). Fixed layouts stay utility strings; CVA is only for actual variants. Classes that switch on a prop are declared with `cva()` from `class-variance-authority` (`buttonVariants`, `badgeVariants`), and the props type comes from `VariantProps`. A string two files share is exported from the primitive that owns it (`buttonVariants`, `fieldControl`, `selectTrigger`, `menuItem`, `surfaceCard`, `shimmerText`). Motion carries its `motion-reduce:` variant in the same string. `app/globals.css` gets no component classes.
- **Token naming in `@theme`.** A fill keeps its bare role (`bg-danger-surface`), a border keeps `border-` (`inset-ring-border-disabled`), text on a fill takes `on-` (`text-on-success-soft`), other text keeps its role (`text-primary-ghost`). Component-scoped tokens (`--switch-*`, `--badge-*`, `--tooltip-*`, `--modal-*`, `--menu-*`) stay unmapped and are read as `bg-(--switch-track-color)`.
- **Motion is CSS only.** There is no `tw-animate-css`, so `animate-in`, `fade-in-0` and `zoom-in-95` generate nothing. Overlays animate from Base UI's `data-starting-style` and `data-ending-style` variants. Entrances use the named keyframes: `animate-rise-in`, `animate-fade-in`, `animate-shimmer`, `animate-spinner`, `animate-pulse-opacity`.
- **Theme storage is separate from activation.** The full app/site token foundation includes dark overrides under `:root[data-theme="dark"]`, but the product stays light with no OS-driven theme or toggle. Site tokens and `type-site-*` utilities do not change app typography or load site fonts.
- Look a class up on demand in `app/globals.css` rather than guessing. A utility with no token behind it is a bug.
- A token added or changed in `app/globals.css` is documented in `design-system.md` in the same diff (`CLAUDE.md`).

- **Flat surfaces.** No container drop shadows. App/site cast tokens and the default Tailwind shadow/drop-shadow scales are removed. Keep crisp hairline frames, field inset rings and focus outlines. Dialogs and sheets use their fill and backdrop; shared popups use `shadow-hairline`.
