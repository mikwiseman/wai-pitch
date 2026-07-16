import 'server-only';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'node:fs';
import * as schema from './schema';
import { DATA_DIR, DB_PATH } from './path';

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database.Database | null = null;

// Idempotent schema creation keeps the app self-contained (no migration step).
export function ensureSchema(sqlite: Database.Database) {
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY, owner_id TEXT, name TEXT NOT NULL, color TEXT NOT NULL DEFAULT '#cc785c',
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
    CREATE TABLE IF NOT EXISTS "user" (
      "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "email" TEXT NOT NULL UNIQUE,
      "emailVerified" INTEGER NOT NULL, "image" TEXT, "createdAt" DATE NOT NULL, "updatedAt" DATE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "session" (
      "id" TEXT NOT NULL PRIMARY KEY, "expiresAt" DATE NOT NULL, "token" TEXT NOT NULL UNIQUE,
      "createdAt" DATE NOT NULL, "updatedAt" DATE NOT NULL, "ipAddress" TEXT, "userAgent" TEXT,
      "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS "account" (
      "id" TEXT NOT NULL PRIMARY KEY, "accountId" TEXT NOT NULL, "providerId" TEXT NOT NULL,
      "userId" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
      "accessToken" TEXT, "refreshToken" TEXT, "idToken" TEXT, "accessTokenExpiresAt" DATE,
      "refreshTokenExpiresAt" DATE, "scope" TEXT, "password" TEXT,
      "createdAt" DATE NOT NULL, "updatedAt" DATE NOT NULL
    );
    CREATE TABLE IF NOT EXISTS "verification" (
      "id" TEXT NOT NULL PRIMARY KEY, "identifier" TEXT NOT NULL, "value" TEXT NOT NULL,
      "expiresAt" DATE NOT NULL, "createdAt" DATE NOT NULL, "updatedAt" DATE NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pres_ws ON presentations(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_pres_folder ON presentations(folder_id);
    CREATE INDEX IF NOT EXISTS idx_pres_share ON presentations(share_token);
    CREATE INDEX IF NOT EXISTS idx_folders_ws ON folders(workspace_id);
    CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("userId");
    CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("userId");
    CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");
  `);
  const workspaceColumns = sqlite.prepare('PRAGMA table_info(workspaces)').all() as Array<{ name: string }>;
  if (!workspaceColumns.some((column) => column.name === 'owner_id')) {
    sqlite.exec('ALTER TABLE workspaces ADD COLUMN owner_id TEXT');
  }
  sqlite.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id) WHERE owner_id IS NOT NULL');
}

export function getDb() {
  if (_db) return _db;
  mkdirSync(DATA_DIR, { recursive: true });
  const sqlite = new Database(DB_PATH);
  _sqlite = sqlite;
  ensureSchema(sqlite);
  _db = drizzle(sqlite, { schema });
  ensureSeed();
  return _db;
}

export function getSqlite() {
  if (!_sqlite) getDb();
  return _sqlite!;
}

// Guarantee a default workspace exists so the app always has a home.
export const DEFAULT_WORKSPACE_ID = 'ws_waiwai';
function ensureSeed() {
  const db = _db!;
  const existing = db.select().from(schema.workspaces).all();
  if (existing.length === 0) {
    db.insert(schema.workspaces).values({
      id: DEFAULT_WORKSPACE_ID, ownerId: null, name: 'WaiWai', color: '#cc785c', createdAt: Date.now(),
    }).run();
  }
}

export { schema };
