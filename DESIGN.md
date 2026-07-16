# WAI Design — design contract

WAI Design should feel like a calm creative room: light, precise, expressive,
and never crowded. The system combines Claude Design’s conversational creation
flow, Pitch’s presentation craft, Figma’s editable precision, and Framer’s
canvas-to-output mindset.

## Product hierarchy

1. **Content is the hero.** Creative work sits on opaque, predictable surfaces.
2. **Glass is functional chrome.** Use it for navigation, tool docks, floating
   panels, and transient controls—not as decoration on every content card.
3. **Air communicates confidence.** Prefer fewer, better-labelled actions and
   generous space around the current decision.
4. **AI accelerates a first useful draft.** Every generated result remains
   editable; AI never becomes a dead-end preview.

This follows Apple’s current Liquid Glass guidance: material establishes a
functional layer above content and should be used sparingly so legibility and
hierarchy stay intact.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `--color-paper` | `#f8fafb` | Primary app and panel surface |
| `--color-paper-2` | `#edf1f3` | Recessed controls and canvas atmosphere |
| `--color-paper-3` | `#e5ebee` | Hover and selection surfaces |
| `--color-ink` | `#152229` | Primary text and dark actions |
| `--color-ink-2` | `#617078` | Secondary text |
| `--color-ink-3` | `#8d9aa0` | Metadata and quiet labels |
| `--color-clay` | `#6d5dfc` | Creative accent and selection |
| `--color-clay-wash` | `#eeeaff` | Accent tint |

Supporting cyan (`#65d8d3`) and rose (`#ff7a9e`) are limited to previews,
starter canvases, and ambient color. They are not competing action colors.

## Type

- **Display:** Fraunces, regular, tightly tracked. Use for emotional hierarchy,
  project moments, and starter-canvas headlines.
- **Interface:** Inter. Use compact weights and small uppercase labels for
  navigation, controls, and metadata.
- Avoid large blocks of serif body copy or tiny low-contrast utility text.

## Material and depth

- `.glass-panel` is the single glass recipe: translucent white gradient,
  saturation, 30px backdrop blur, a white edge, and one soft shadow.
- Content cards remain predominantly opaque.
- Respect `prefers-reduced-transparency` and `prefers-reduced-motion`.
- Every text-on-glass combination must remain legible over both the violet and
  cyan ambient fields.

## Shape and spacing

- App shell: 28px radius.
- Major floating panels: 20–30px radius.
- Controls: 11–14px radius.
- Use 8px as the base rhythm; section gaps may expand to 56–84px.
- Prefer a hairline and soft atmospheric shadow over heavy borders.

## Canvas rules

All creative work renders through `src/components/stage/Stage.tsx` at
1920×1080. Editor, player, share view, and thumbnails must not introduce a
second coordinate system.

Canvas fitting must remeasure when a real frame is hydrated, not only when zoom
changes. Any flex or grid item containing a Stage needs `min-width: 0`.

## Responsive behavior

- Dashboard navigation becomes a compact horizontal glass bar.
- The editor keeps frames and canvas visible as long as space allows.
- At narrow widths, Properties becomes a toggleable overlay instead of forcing
  horizontal overflow.
- The central canvas must remain fully visible and centered at every tested
  width.

## Review checklist

- No horizontal document overflow.
- Glass appears only in functional layers.
- Every control has an accessible name and visible focus state.
- Empty, loading, error, and long-library states are intentional.
- Creation modes produce meaningfully different starter structures.
- Insert, autosave, present, share, and public view remain functional.
