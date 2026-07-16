# WAI Design

WAI Design is a self-hosted visual studio for interface concepts, product
prototypes, and presentations. It combines a precise 1920×1080 canvas with a
calm, spacious product shell and AI-assisted first drafts.

The product evolved from the original `wai-pitch` foundation. The proven
editor, persistence, player, sharing, and Pitch import engine remain intact;
the creation experience and visual system have been rebuilt around a broader
design workflow.

## Creation modes

- **Interface** — opens with a desktop product concept, a mobile flow, and a UI
  kit so product work starts from realistic structure.
- **Presentation** — opens with a complete three-frame narrative rather than a
  blank deck.
- **Prototype** — opens with a three-step product flow designed for review and
  iteration.
- **Create with AI** — turns a prompt into a structured editable presentation
  when `ANTHROPIC_API_KEY` is configured.

Every starter is fully editable. Text, images, shapes, tables, charts, and
embeds use the same WYSIWYG renderer in the editor, thumbnails, player, and
public share view.

## Product capabilities

- Liquid-glass navigation and controls with an unobstructed content canvas.
- Large-library dashboard with search, folders, sort, trash, sharing, and
  paged rendering for imported workspaces.
- Drag, resize, rotate, layer, lock, duplicate, and inline-edit blocks.
- Snap guides, keyboard nudging, undo/redo, debounced autosave, speaker notes,
  and per-frame backgrounds.
- Fullscreen presentation mode, deep links, PDF printing, and public read-only
  links.
- Full Pitch.com account import support, including folder hierarchy and
  high-fidelity slide images.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Verification:

```bash
npm test
npm run typecheck
npm run build
```

## Data and security

SQLite data lives in `data/wai-pitch.db`; uploaded and imported media lives in
`data/uploads/`. Both are intentionally excluded from Git.

This remains a single-user workspace without application-level authentication.
Do not expose the app container directly to the public internet: CRUD routes
can modify or delete content. The supplied Compose stack keeps Next.js on
`127.0.0.1:3000` and exposes only Caddy, which terminates HTTPS and requires
HTTP Basic Auth for every route.

## Production container

The image uses the official Node 24 Debian runtime and Next.js standalone
output. The app persists data through a bind mount. Caddy 2.11.4 provisions and
renews TLS for `design.waiwai.is`; its certificate state is kept in named
volumes.

Before starting the public stack, put the username and bcrypt password hash in
an untracked `Caddyfile.users` file:

```caddyfile
mik $2a$14$...
```

Generate the value with `caddy hash-password`; never store the plaintext
password in the repository.

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/api/health
```

The authenticated production URL is
[https://design.waiwai.is](https://design.waiwai.is).

## Architecture

- Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4
- SQLite via better-sqlite3 and Drizzle
- Zod-validated deck data
- Zustand + zundo editor state
- dnd-kit ordering and gestures
- Anthropic SDK for AI drafting

The central invariant is a single fixed 1920×1080 `Stage`. Every surface
transform-scales that same renderer, so an edited frame and its presented frame
remain pixel-identical.

## Pitch import

The existing `tools/pitch-export/` pipeline can export an authenticated Pitch
workspace into `pitch-export/`. Import it with:

```bash
npm run import:pitch
```

See `docs/pitch-study.md` for the mapped Pitch data model and API observations.
