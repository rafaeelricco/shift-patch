# Tailwind

Tailwind v4, configured in CSS: `app/globals.css` holds the tokens, and its `@theme inline reference` block maps them to utilities. There is no `tailwind.config.*`. Class merging goes through `cn()` in `lib/utils.ts` (`@lib/utils`). Primitives live in `components/ui/*`. See also `index.md` (routing) and `design-system.md` (visual spec).

- Use the semantic utilities the theme defines, never the primitive ramps or raw hex:

  | Job      | Utilities                                                                                                  |
  | -------- | ---------------------------------------------------------------------------------------------------------- |
  | Surfaces | `bg-surface`, `bg-surface-tertiary`, `bg-card`, `bg-elevated`, `bg-control`                                |
  | Text     | `text-primary`, `text-secondary`, `text-tertiary` (placeholders only), `text-accent`                       |
  | Intents  | `text-danger`, `text-success`, `text-warning`, `text-info`, `bg-danger-soft`, and so on                    |
  | Borders  | `border-default`, `border-strong`, `border-subtle`                                                         |
  | Action   | `bg-primary-solid`, `text-on-primary-solid`                                                                |
  | Type     | `type-heading-xl` to `type-heading-xs`, `type-text-lg` to `type-text-xs`, `type-small-caps-md`             |
  | Other    | `font-mono`, `tabular-nums`, `shadow-card`, `shadow-dropdown`, `rounded-lg`, `rounded-2xl`, `rounded-full` |

- **The `bg-primary` trap.** The theme's `primary`, `secondary` and `accent` colors are text colors, so they exist as background utilities and paint the wrong thing. `bg-primary` is near-black and skips navy, `bg-secondary` is grey text color, and `bg-accent` is link blue. The navy action is `bg-primary-solid`, and in practice `<Button>` or `.btn-solid-primary`.
- **Names from other shadcn projects don't exist here.** `text-foreground`, `text-muted-foreground`, `bg-background`, `bg-muted`, `bg-popover`, `border-input` and `bg-destructive` generate nothing, with no error. Use the table above.
- **Components use CSS classes.** `.btn`, `.field-control`, `.badge`, `.banner`, `.data-table`, `.dialog-popup`, `.menu-item` and the rest sit in `@layer components` in `app/globals.css`, built from tokens. A new primitive adds a class there, with its reduced-motion rule in the same diff, rather than a long utility string.
- **Motion is CSS only.** There is no `tw-animate-css`, so `animate-in`, `fade-in-0` and `zoom-in-95` generate nothing. Overlays animate from Base UI's `data-starting-style` and `data-ending-style`.
- **There is no `dark:`.** The product is light only.
- Look a class up on demand in `app/globals.css` rather than guessing. A utility with no token behind it is a bug.
- A token added or changed in `app/globals.css` is documented in `design-system.md` in the same diff (`CLAUDE.md`).
