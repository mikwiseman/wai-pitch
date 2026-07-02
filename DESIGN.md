# wai-pitch — design contract

The look fuses Pitch's product craft with Anthropic's "Claude paper" aesthetic:
warm ivory paper, one rationed clay accent, hairlines instead of shadows, and an
editorial serif for display type. Tokens live in `src/app/globals.css` under
`@theme` and are the single source of truth. Do not hardcode hex values in
components — use the tokens.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `--color-paper` | `#faf9f5` | app + slide background (ivory) |
| `--color-paper-2` | `#f0ece1` | raised panels, canvas backdrop |
| `--color-paper-3` | `#e9e4d8` | hover fills |
| `--color-ink` | `#1a1a18` | primary text / near-black |
| `--color-ink-2` | `#5f5c54` | secondary text |
| `--color-ink-3` | `#8b877c` | tertiary / meta |
| `--color-line` | `#e6e2d9` | hairlines |
| `--color-line-2` | `#d8d3c7` | stronger hairline / control borders |
| `--color-clay` | `#cc785c` | the one accent (selection, primary actions) |
| `--color-clay-ink` | `#b5613f` | accent hover / text on light |
| `--color-clay-wash` | `#f4e6df` | accent tint (AI, badges) |

The clay accent is **rationed** — selection outlines, snap guides, the AI
affordance, the present progress bar. If everything is accented, nothing is.

## Type

- Display / titles: `--font-serif` (Fraunces), weight 400, tight tracking
  (`-0.02em`). Utility classes `.t-display`, `.t-title`.
- Body / UI: `--font-sans` (Inter). Both wired via `next/font` in
  `src/app/layout.tsx`.

## Shape & depth

- Radii: `--radius-sm|--radius|--radius-lg|--radius-xl` (6/10/16/22px).
- Prefer **1px hairlines** (`--color-line`) over shadows. Cards use a very soft
  `--shadow-card`; only popovers use `--shadow-pop`.
- Reusable atoms in `globals.css`: `.card`, `.btn` (+ `-primary`, `-accent`,
  `-ghost`, `-icon`), `.input`.

## The Stage (WYSIWYG rule)

Everything visual renders through `src/components/stage/Stage.tsx` at a fixed
1920×1080 and is transform-scaled to fit. Editor, player, share view and
thumbnails therefore look identical. Blocks are positioned in absolute stage
pixels; never introduce a second coordinate system.

Gotcha: a flex/grid item that contains a `<Stage>` needs `min-width: 0`, because
the Stage's inner layer is 1920px wide and will otherwise blow out the column.
