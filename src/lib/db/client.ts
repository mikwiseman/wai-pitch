import 'server-only';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import * as schema from './schema';

const DATA_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DATA_DIR, 'wai-pitch.db');

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Idempotent schema creation keeps the app self-contained (no migration step).
function ensureSchema(sqlite: Database.Database) {
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#cc785c',
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, parent_id TEXT,
      name TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS presentations (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, folder_id TEXT,
      title TEXT NOT NULL DEFAULT 'Untitled', content TEXT NOT NULL,
      share_token TEXT, published INTEGER NOT NULL DEFAULT 0, position INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, deleted_at INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_pres_ws ON presentations(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_pres_folder ON presentations(folder_id);
    CREATE INDEX IF NOT EXISTS idx_pres_share ON presentations(share_token);
    CREATE INDEX IF NOT EXISTS idx_folders_ws ON folders(workspace_id);
  `);
}

export function getDb() {
  if (_db) return _db;
  mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  ensureSchema(sqlite);
  _db = drizzle(sqlite, { schema });
  ensureSeed();
  return _db;
}

// Guarantee a default workspace exists so the app always has a home.
export const DEFAULT_WORKSPACE_ID = 'ws_waiwai';
function ensureSeed() {
  const db = _db!;
  const existing = db.select().from(schema.workspaces).all();
  if (existing.length === 0) {
    db.insert(schema.workspaces).values({
      id: DEFAULT_WORKSPACE_ID, name: 'WaiWai', color: '#cc785c', createdAt: Date.now(),
    }).run();
  }
}

export { schema };
