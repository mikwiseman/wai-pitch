// Import the pitch.com export into wai-pitch's SQLite DB.
// Strategy: each exported deck becomes a presentation whose slides are the
// full-fidelity rendered PNGs (one full-bleed image block per slide), placed
// into folders mirroring the catalog hierarchy. Reliable and pixel-perfect;
// decks are immediately viewable, presentable and shareable in the clone.
//
// Run: npm run import:pitch   (dev server not required)
import Database from 'better-sqlite3';
import { readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { nanoid } from 'nanoid';

const ROOT = process.cwd();
const EXPORT = join(ROOT, 'pitch-export');
const DATA = join(ROOT, 'data');
const UPLOADS = join(DATA, 'uploads');
const DB_PATH = join(DATA, 'wai-pitch.db');
const WS = 'ws_waiwai';

if (!existsSync(join(EXPORT, 'catalog.json'))) { console.error('No pitch-export/catalog.json — run the export first.'); process.exit(1); }
mkdirSync(UPLOADS, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#cc785c', created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS folders (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, parent_id TEXT, name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS presentations (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, folder_id TEXT, title TEXT NOT NULL DEFAULT 'Untitled', content TEXT NOT NULL, share_token TEXT, published INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER);
`);
const now = Date.now();
db.prepare(`INSERT OR IGNORE INTO workspaces (id,name,color,created_at) VALUES (?,?,?,?)`).run(WS, 'WaiWai', '#cc785c', now);

type Cat = { folders: { id: string; name: string; parentId: string | null; path: string }[]; presentations: { documentId: string; name: string; folder: string; trashed: boolean; updatedAt: number | null }[] };
const catalog = JSON.parse(readFileSync(join(EXPORT, 'catalog.json'), 'utf8')) as Cat;

// 1) Create folders mirroring catalog "A / B / C" paths (deduped, nested).
// Preload existing folders (by resolved path) so re-runs reuse, never duplicate.
const folderIdByPath = new Map<string, string>();
{
  const rows = db.prepare(`SELECT id, parent_id as parentId, name FROM folders WHERE workspace_id = ?`).all(WS) as { id: string; parentId: string | null; name: string }[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const pathOf = (id: string, guard = 0): string => {
    const r = byId.get(id); if (!r || guard > 40) return '';
    return r.parentId && byId.has(r.parentId) ? `${pathOf(r.parentId, guard + 1)} / ${r.name}` : r.name;
  };
  for (const r of rows) folderIdByPath.set(pathOf(r.id), r.id);
}
function ensureFolderPath(path: string): string | null {
  if (!path || path === '(root)') return null;
  if (folderIdByPath.has(path)) return folderIdByPath.get(path)!;
  const parts = path.split(' / ');
  let parentId: string | null = null;
  let acc = '';
  for (const part of parts) {
    acc = acc ? `${acc} / ${part}` : part;
    if (folderIdByPath.has(acc)) { parentId = folderIdByPath.get(acc)!; continue; }
    const id = 'f_' + nanoid(10);
    db.prepare(`INSERT INTO folders (id,workspace_id,parent_id,name,position,created_at) VALUES (?,?,?,?,?,?)`).run(id, WS, parentId, part, folderIdByPath.size, now);
    folderIdByPath.set(acc, id);
    parentId = id;
  }
  return parentId;
}
for (const f of catalog.folders) ensureFolderPath(f.path);

// 2) Import each exported deck dir that has rendered slides.
// Only import fully-exported decks (the exporter writes _done.json last).
const dirs = readdirSync(join(EXPORT, 'presentations')).filter((d) => existsSync(join(EXPORT, 'presentations', d, '_done.json')) && existsSync(join(EXPORT, 'presentations', d, 'meta.json')));
const catByDoc = new Map(catalog.presentations.map((p) => [p.documentId, p]));

let imported = 0, skipped = 0, errored = 0;
const upsert = db.prepare(`INSERT OR REPLACE INTO presentations (id,workspace_id,folder_id,title,content,share_token,published,position,created_at,updated_at,deleted_at) VALUES (@id,@ws,@folder,@title,@content,NULL,0,@pos,@created,@updated,NULL)`);

for (const dir of dirs) {
 try {
  const base = join(EXPORT, 'presentations', dir);
  const docId = dir.slice(-8); // trailing docId prefix used in dir name
  const meta = JSON.parse(readFileSync(join(base, 'meta.json'), 'utf8')) as { documentId: string; name: string; folder?: string };
  const cat = catByDoc.get(meta.documentId);
  if (cat?.trashed) { skipped++; continue; }

  const pngs = readdirSync(join(base, 'slides')).filter((f) => f.endsWith('.png')).sort();
  if (!pngs.length) { skipped++; continue; }

  // Copy PNGs into uploads with flat unique names; build image-backed slides.
  const slides = pngs.map((png) => {
    const uname = `pitch-${meta.documentId.slice(0, 8)}-${png}`;
    copyFileSync(join(base, 'slides', png), join(UPLOADS, uname));
    return {
      id: 's_' + nanoid(10),
      background: { type: 'color', color: '#000000', gradient: 'linear-gradient(135deg,#faf9f5,#f0ece1)', image: '', imageFit: 'cover' },
      blocks: [{
        id: 'b_' + nanoid(10), type: 'image', x: 0, y: 0, w: 1920, h: 1080, rotation: 0, opacity: 1, z: 0, locked: false,
        src: `/api/uploads/${uname}`, fit: 'contain', radius: 0, alt: meta.name,
      }],
      notes: '', transition: 'fade',
    };
  });
  const deck = { version: 1, theme: { name: 'Imported', fontHeading: 'var(--font-serif)', fontBody: 'var(--font-sans)', accent: '#cc785c', paper: '#faf9f5', ink: '#1a1a18' }, slides };

  const ts = Number(cat?.updatedAt) || now;
  upsert.run({
    id: 'p_import_' + meta.documentId.slice(0, 12),
    ws: WS,
    folder: ensureFolderPath(cat?.folder || meta.folder || '(root)'),
    title: String(meta.name || 'Untitled'),
    content: JSON.stringify(deck),
    pos: ts,
    created: ts,
    updated: ts,
  });
  imported++;
  if (imported % 10 === 0) console.log(`  …${imported} decks`);
  void docId;
 } catch (e) { errored++; console.warn(`  skip ${dir}: ${String(e).slice(0, 100)}`); }
}

console.log(`\nImported ${imported} decks (${skipped} skipped, ${errored} errored). Folders: ${folderIdByPath.size}.`);
db.close();
