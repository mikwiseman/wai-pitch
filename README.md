# wai-pitch

A self-hosted presentation service — a functional clone of Pitch.com — with a
warm, editorial "Claude paper" design language. Create, edit, present and share
decks; plus a full one-command **export** of an existing Pitch.com account and an
**import** of that content into this app.

## What it does

- **Dashboard / library** — teamspace sidebar with a nested folder tree, a
  documents grid with live WYSIWYG thumbnails, create / rename / duplicate /
  move / delete, "Recently deleted" trash with restore + delete-forever, search
  and sort.
- **Editor** — a fixed 1920×1080 canvas with block types **text, image, shape,
  table, chart, embed**; drag / resize / rotate with snap guides; a slide panel
  with drag-to-reorder, duplicate and delete; a properties inspector; undo/redo;
  debounced autosave; per-slide background + speaker notes; zoom; keyboard
  shortcuts.
- **Player** — fullscreen present mode with keyboard navigation, `#N` deep
  links, fade transitions, a progress bar, and one-click **PDF export** (print).
- **Share** — a public read-only link at `/v/<token>`.
- **Create with AI** — describe a deck and Claude drafts a structured outline
  that's composed into positioned slides (needs `ANTHROPIC_API_KEY`).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (CSS-first) ·
Zod 4 · SQLite (better-sqlite3 + Drizzle) · Zustand + zundo (undo/redo) ·
dnd-kit · `@anthropic-ai/sdk`.

Data lives in `data/wai-pitch.db` (auto-created); uploaded images in
`data/uploads/`. No external services required to run.

## Scope & security

This is a **single-user, single-workspace** tool with **no authentication** — it
is meant to run locally or behind your own access control. Rich-text HTML is
sanitized on write and uploads are validated by magic bytes (raster images only,
no SVG), so the public share view is safe to hand out, but the CRUD API is
unauthenticated. **Do not expose the app itself to the open internet without
adding an auth layer** (e.g. a reverse-proxy password or a Next.js middleware
guard); anyone who can reach the API could edit or delete presentations.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional, for Create with AI:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# optional: export ANTHROPIC_MODEL=claude-sonnet-5
```

## Architecture

- A deck is **Zod-validated typed data** (`src/types/deck.ts`): a `Deck` has a
  theme and `slides[]`; each `Slide` has a background, `notes`, and `blocks[]`;
  each `Block` is a discriminated union positioned in absolute stage pixels.
- Every surface renders through one fixed **1920×1080 `<Stage>`**
  (`src/components/stage/`) that transform-scales to fit its container, so the
  editor, player, share view and thumbnails are pixel-identical (WYSIWYG by
  construction).
- Persistence is a single `presentations` table storing the deck as JSON, plus
  `folders` and `workspaces` (`src/lib/db/`, `src/lib/repo.ts`). Schema is
  created idempotently on first connect — no migration step.
- Editor state is a Zustand store wrapped with `zundo` for undo/redo
  (`src/lib/editor-store.ts`); the top-level editor autosaves via
  `PUT /api/presentations/:id`.

## Export & import an existing Pitch.com account

`tools/pitch-export/` reuses your logged-in Pitch session by launching a
headless Chromium against a **copy** of your Chromium/Comet profile (your live
browser is never touched), then:

1. `02-export-objects.mjs` — pulls every object (folders, presentations,
   teamspaces, styles) from Pitch's sync API → `pitch-export/decoded/`.
2. `03-build-catalog.mjs` — assembles `pitch-export/catalog.{json,md}` (folder
   tree, live vs. trashed presentations).
3. `04-export-decks.mjs` — opens each deck and captures every slide as a
   full-fidelity PNG plus the slide/block JSON (read from the app's IndexedDB).
   Resumable; skips finished decks.

Then bring it into the app:

```bash
npm run import:pitch   # mirrors the folder tree; each deck's slides become
                       # full-fidelity image slides. Idempotent.
```

See `docs/pitch-study.md` for how Pitch's data model and API were mapped.
