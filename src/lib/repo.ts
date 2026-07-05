import 'server-only';
import { and, eq, isNull, isNotNull, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb, schema, DEFAULT_WORKSPACE_ID } from './db/client';
import { Deck, emptyDeck, type Deck as DeckT } from '@/types/deck';
import { starterDeck } from './starter';

export { DEFAULT_WORKSPACE_ID };

export function listWorkspaces() {
  return getDb().select().from(schema.workspaces).all();
}

export function listFolders(workspaceId = DEFAULT_WORKSPACE_ID) {
  return getDb().select().from(schema.folders).where(eq(schema.folders.workspaceId, workspaceId)).all();
}

export function getFolder(id: string) {
  return getDb().select().from(schema.folders).where(eq(schema.folders.id, id)).get();
}

// True if `folderId` names a folder in the given workspace (or is null = root).
function folderOk(folderId: string | null | undefined, workspaceId: string): boolean {
  if (folderId == null) return true;
  const f = getFolder(folderId);
  return !!f && f.workspaceId === workspaceId;
}

export function createFolder(name: string, parentId: string | null, workspaceId = DEFAULT_WORKSPACE_ID) {
  if (!folderOk(parentId, workspaceId)) throw new Error('parent folder not found');
  const row = { id: 'f_' + nanoid(10), workspaceId, parentId, name, position: Date.now(), createdAt: Date.now() };
  getDb().insert(schema.folders).values(row).run();
  return row;
}

export function renameFolder(id: string, name: string) {
  getDb().update(schema.folders).set({ name }).where(eq(schema.folders.id, id)).run();
}

// Recursively soft-delete every presentation under a folder subtree, then
// hard-delete the folders — so nested folders and their decks are never orphaned.
export function deleteFolder(id: string) {
  const db = getDb();
  const all = db.select().from(schema.folders).all();
  const ids = [id];
  for (let i = 0; i < ids.length; i++) {
    for (const f of all) if (f.parentId === ids[i]) ids.push(f.id);
  }
  const now = Date.now();
  for (const fid of ids) {
    db.update(schema.presentations).set({ deletedAt: now }).where(eq(schema.presentations.folderId, fid)).run();
    db.delete(schema.folders).where(eq(schema.folders.id, fid)).run();
  }
}

type PresRow = typeof schema.presentations.$inferSelect;

export function listPresentations(opts: { workspaceId?: string; folderId?: string | null; trashed?: boolean } = {}) {
  const db = getDb();
  const wid = opts.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const conds = [eq(schema.presentations.workspaceId, wid)];
  conds.push(opts.trashed ? isNotNull(schema.presentations.deletedAt) : isNull(schema.presentations.deletedAt));
  if (opts.folderId !== undefined) {
    conds.push(opts.folderId === null ? isNull(schema.presentations.folderId) : eq(schema.presentations.folderId, opts.folderId));
  }
  return db.select().from(schema.presentations).where(and(...conds)).orderBy(desc(schema.presentations.updatedAt)).all();
}

export function getPresentation(id: string): PresRow | undefined {
  return getDb().select().from(schema.presentations).where(eq(schema.presentations.id, id)).get();
}

export function getPresentationByShare(token: string): PresRow | undefined {
  return getDb().select().from(schema.presentations).where(eq(schema.presentations.shareToken, token)).get();
}

export function deckOf(row: PresRow): DeckT {
  try { return Deck.parse(JSON.parse(row.content)); }
  catch { return emptyDeck(); }
}

export function createPresentation(opts: { title?: string; folderId?: string | null; deck?: DeckT; workspaceId?: string } = {}) {
  const now = Date.now();
  const workspaceId = opts.workspaceId ?? DEFAULT_WORKSPACE_ID;
  // Ignore a bad folderId rather than stranding the deck in a nonexistent folder.
  const folderId = folderOk(opts.folderId, workspaceId) ? (opts.folderId ?? null) : null;
  const deck = opts.deck ?? starterDeck(opts.title ?? 'Untitled presentation');
  const row = {
    id: 'p_' + nanoid(12),
    workspaceId,
    folderId,
    title: opts.title ?? 'Untitled presentation',
    content: JSON.stringify(deck),
    shareToken: null as string | null,
    published: 0,
    position: now,
    createdAt: now,
    updatedAt: now,
    deletedAt: null as number | null,
  };
  getDb().insert(schema.presentations).values(row).run();
  return row;
}

export function updatePresentation(id: string, patch: Partial<{ title: string; content: DeckT; folderId: string | null }>) {
  const cur = getPresentation(id);
  if (!cur) return undefined;
  const set: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.folderId !== undefined) {
    // Only accept a target folder that exists in the same workspace (or root).
    set.folderId = folderOk(patch.folderId, cur.workspaceId) ? patch.folderId : null;
  }
  if (patch.content !== undefined) set.content = JSON.stringify(Deck.parse(patch.content));
  getDb().update(schema.presentations).set(set).where(eq(schema.presentations.id, id)).run();
  return getPresentation(id);
}

export function duplicatePresentation(id: string) {
  const src = getPresentation(id);
  if (!src) return undefined;
  const now = Date.now();
  const row = { ...src, id: 'p_' + nanoid(12), title: src.title + ' (copy)', shareToken: null, published: 0, createdAt: now, updatedAt: now, position: now };
  getDb().insert(schema.presentations).values(row).run();
  return row;
}

export function trashPresentation(id: string) {
  getDb().update(schema.presentations).set({ deletedAt: Date.now() }).where(eq(schema.presentations.id, id)).run();
}

export function restorePresentation(id: string) {
  getDb().update(schema.presentations).set({ deletedAt: null }).where(eq(schema.presentations.id, id)).run();
}

export function destroyPresentation(id: string) {
  getDb().delete(schema.presentations).where(eq(schema.presentations.id, id)).run();
}

export function setShare(id: string, on: boolean) {
  const token = on ? 's_' + nanoid(16) : null;
  getDb().update(schema.presentations).set({ shareToken: token, published: on ? 1 : 0 }).where(eq(schema.presentations.id, id)).run();
  return token;
}
