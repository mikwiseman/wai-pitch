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
- Editable PowerPoint/Pitch import: text, raster images, and basic shapes become
  native objects; complex Office objects are preserved as locked visuals and
  listed in a compatibility report.
- Account registration, password sign-in, five-minute single-use magic links,
  password recovery, rate limiting, and per-account workspace isolation.

## Run locally

```bash
npm install
npx auth@1.6.23 secret
cp .env.example .env
npm run dev
```

Set the generated `BETTER_AUTH_SECRET`, a Resend API key, a verified sender,
and `LEGACY_OWNER_EMAIL` in `.env`, then open
[http://localhost:3000](http://localhost:3000).

Verification:

```bash
npm test
npm run typecheck
npm run build
```

## Data and security

SQLite data lives in `data/wai-pitch.db`; uploaded and imported media lives in
`data/uploads/`. Both are intentionally excluded from Git.

Better Auth stores users, sessions, accounts, and single-use verification
records in the same SQLite database. Every private page and CRUD route validates
the session and scopes reads and writes to the account workspace. Public share
links remain read-only. On the first authenticated request,
`LEGACY_OWNER_EMAIL` atomically claims the pre-authentication workspace; all
other accounts receive isolated empty workspaces.

The supplied Compose stack keeps Next.js on `127.0.0.1:3000` and exposes only
Caddy. Caddy terminates HTTPS and applies security headers; application-level
authentication owns sign-in and registration.

## Production container

The image uses the official Node 24 Debian runtime and Next.js standalone
output. The app persists data through a bind mount. Caddy 2.11.4 provisions and
renews TLS for `design.waiwai.is`; its certificate state is kept in named
volumes.

Before starting the stack, copy `.env.example` to `.env` and provide every
required authentication and email value. Never commit `.env`.

```bash
docker compose up -d --build
docker compose ps
curl http://127.0.0.1:3000/api/health
```

The production URL is
[https://design.waiwai.is](https://design.waiwai.is).

## Architecture

- Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4
- SQLite via better-sqlite3 and Drizzle
- Better Auth 1.6 with Resend transactional email
- pptx-svg for PowerPoint rendering and metadata extraction
- Zod-validated deck data
- Zustand + zundo editor state
- dnd-kit ordering and gestures
- Anthropic SDK for AI drafting

The central invariant is a single fixed 1920×1080 `Stage`. Every surface
transform-scales that same renderer, so an edited frame and its presented frame
remain pixel-identical.

## Editable Pitch import

In Pitch, export the presentation as PowerPoint (`.pptx`). In WAI Design, choose
**Import** and drop the file. The result screen reports native editable objects,
locked complex visuals, and skipped hidden slides before opening the deck.

The historical account exporter is still available for preserving legacy
workspaces as high-fidelity slide images:

```bash
npm run import:pitch
```

See `docs/pitch-study.md` for the mapped Pitch data model and API observations.
