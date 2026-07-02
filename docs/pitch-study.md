# Pitch.com — study notes (what drove the clone + export)

Observations from instrumenting an authenticated session, used to design the
data model and the exporter. These are interoperability facts about the API
surface and data shapes, not Pitch's source.

## Product surfaces

- **Dashboard**: left sidebar = workspace switcher, search, nav (Recents /
  Manage library), then teamspaces each expanding into a nested folder tree.
  Main area = "Create with AI / Create presentation / Create room / Create
  folder" tiles, then a documents grid with live slide thumbnails, "updated X"
  meta, and a per-card share-link badge.
- **Editor**: top insert bar (Text, Media, Shape, Chart, Table, Embed, Record),
  left slide list with "Add slide", center canvas, right context rail
  (comments, notes, etc.), bottom "Slide style / Slide color / Background
  image" bar, plus Share and Present.
- **Player** ("player-v2"): renders each slide as scaled HTML in a `.slide`
  stage with prev/next controls, an `n / total` counter, fullscreen, and a
  slide-line.

## Data model

Pitch is a real-time, offline-first CRDT app. Wire format is **Transit+JSON**
(`application/transit+json`); the local store is IndexedDB (`pitch-objects-*`
DB, `canonical` object store). Objects are addressed by UUID inside a
**keyspace** (`workspace`, `private-space`, `editor`, `user-vspace`).

Entity types observed:

- **dirent** — the file-tree node. `dirent-type` ∈ {`folder`, `document`};
  `name`, `parent-id`, `document-id`, `document-type` (`presentation`).
  Trash/delete state lives in the object's `meta` (`meta.trash`, `meta.deleted`).
- **document-record** — presentation metadata (`document-id`, created/updated/
  published timestamps, public-access flags).
- **slide** — `blueprint` with `entity-type: slide`, a `theme`, a
  `background-color`, and `children` (the blocks).
- **block** — `entity-type: block`, `block-type` ∈ {text, image, shape, table,
  …}, normalized `coords` `{x-start, y-start, x-end, y-end}` (0–1 of the slide),
  plus per-type props (`body` rich text, `font-size`, `text-color`, `fill`,
  `url` asset id, `corner-roundness`, …).
- **teamspace**, **style/theme**, **workspace-member**, **font**, **media**.

## API surface (all `*.services.pitch.com`, Auth0 Bearer token)

- `POST /fetch-workspaces` — body `{user-id}` → workspaces with `editor-id`.
- `POST /fetch-objects` — the core sync. Body `{editor-id, keyspace, offset,
  select, …}`; returns `{version, vspace-exhausted?, objects}`. A bulk sync uses
  `offset` + a `select` list (dirents, document-records, styles, …). Slide/block
  blueprints are fetched per-document by `object-ids` (not in the bulk select).
- `imgproxy.services.pitch.com/...` — image CDN; `assets.services.pitch.com/
  fonts/*.woff2` — fonts.

## How the export used this

Auth is carried in `localStorage` (Auth0 SPA token), so launching a headless
Chromium against a **copy** of the browser profile reuses the live session
without touching the running browser. Bulk `fetch-objects` (offset 0) gives the
full catalog; per-deck content is captured by opening each deck in the player
(which fully hydrates the `canonical` IndexedDB store) and reading it back, while
screenshotting each rendered slide for pixel-perfect fidelity.

## How this maps to wai-pitch

- Pitch dirent tree → `folders` + `presentations` with `folderId`.
- Pitch normalized `coords` → our absolute stage px (`x = x-start*1920`, etc.).
- Pitch slide/block blueprint → our `Slide`/`Block` union.
- The import currently materializes each deck as full-fidelity **image slides**
  (the exact renders) for reliability; block-level import is a straightforward
  next step given the captured `deck.json` per deck.
