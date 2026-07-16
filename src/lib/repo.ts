import 'server-only';
import { and, eq, isNull, isNotNull, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { getDb, schema, DEFAULT_WORKSPACE_ID } from './db/client';
import { Deck, type Deck as DeckT } from '@/types/deck';
import { DEFAULT_PROJECT_TITLES, starterDeck, type ProjectKind } from './starter';
import { workspaceClaimDecision } from './workspace-scope.mjs';

export { DEFAULT_WORKSPACE_ID };

export class FolderNotFoundError extends Error {
  constructor() {
    super('folder not found');
    this.name = 'FolderNotFoundError';
  }
}

export function listWorkspaces(ownerId: string) {
  return getDb().select().from(schema.workspaces).where(eq(schema.workspaces.ownerId, ownerId)).all();
}

export function ensureWorkspaceForUser(user: { id: string; email: string; name: string }) {
  const db = getDb();
  const existing = db.select().from(schema.workspaces).where(eq(schema.workspaces.ownerId, user.id)).get();
  if (existing) return existing;

  try {
    return db.transaction((tx) => {
      const owned = tx.select().from(schema.workspaces).where(eq(schema.workspaces.ownerId, user.id)).get();
      if (owned) return owned;
      const legacy = tx.select().from(schema.workspaces).where(eq(schema.workspaces.id, DEFAULT_WORKSPACE_ID)).get();
      const decision = workspaceClaimDecision({
        userId: user.id,
        email: user.email,
        legacyOwnerEmail: process.env.LEGACY_OWNER_EMAIL,
        currentOwnerId: legacy?.ownerId ?? null,
      });
      if (legacy && decision === 'claim-legacy') {
        tx.update(schema.workspaces).set({ ownerId: user.id }).where(and(eq(schema.workspaces.id, legacy.id), isNull(schema.workspaces.ownerId))).run();
        const claimed = tx.select().from(schema.workspaces).where(eq(schema.workspaces.ownerId, user.id)).get();
        if (claimed) return claimed;
      }
      const now = Date.now();
      const row = {
        id: 'ws_' + nanoid(12),
        ownerId: user.id,
        name: user.name?.trim() ? `${user.name.trim()}'s workspace` : 'My workspace',
        color: '#6d5dfc',
        createdAt: now,
      };
      tx.insert(schema.workspaces).values(row).run();
      return row;
    });
  } catch (cause) {
    const wonRace = db.select().from(schema.workspaces).where(eq(schema.workspaces.ownerId, user.id)).get();
    if (wonRace) return wonRace;
    throw cause;
  }
}

export function listFolders(workspaceId: string) {
  return getDb().select().from(schema.folders).where(eq(schema.folders.workspaceId, workspaceId)).all();
}

export function getFolder(id: string, workspaceId: string) {
  return getDb().select().from(schema.folders).where(and(eq(schema.folders.id, id), eq(schema.folders.workspaceId, workspaceId))).get();
}

// True if `folderId` names a folder in the given workspace (or is null = root).
function folderOk(folderId: string | null | undefined, workspaceId: string): boolean {
  if (folderId == null) return true;
  return Boolean(getFolder(folderId, workspaceId));
}

export function createFolder(name: string, parentId: string | null, workspaceId = DEFAULT_WORKSPACE_ID) {
  if (!folderOk(parentId, workspaceId)) throw new Error('parent folder not found');
  const row = { id: 'f_' + nanoid(10), workspaceId, parentId, name, position: Date.now(), createdAt: Date.now() };
  getDb().insert(schema.folders).values(row).run();
  return row;
}

export function renameFolder(id: string, name: string, workspaceId: string) {
  return getDb().update(schema.folders).set({ name }).where(and(eq(schema.folders.id, id), eq(schema.folders.workspaceId, workspaceId))).run().changes > 0;
}

// Recursively soft-delete every presentation under a folder subtree, then
// hard-delete the folders — so nested folders and their decks are never orphaned.
export function deleteFolder(id: string, workspaceId: string) {
  const db = getDb();
  if (!getFolder(id, workspaceId)) return false;
  const all = db.select().from(schema.folders).where(eq(schema.folders.workspaceId, workspaceId)).all();
  const ids = [id];
  for (let i = 0; i < ids.length; i++) {
    for (const f of all) if (f.parentId === ids[i]) ids.push(f.id);
  }
  const now = Date.now();
  for (const fid of ids) {
    db.update(schema.presentations).set({ deletedAt: now }).where(and(eq(schema.presentations.workspaceId, workspaceId), eq(schema.presentations.folderId, fid))).run();
    db.delete(schema.folders).where(and(eq(schema.folders.id, fid), eq(schema.folders.workspaceId, workspaceId))).run();
  }
  return true;
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

export function getPresentation(id: string, workspaceId: string): PresRow | undefined {
  return getDb().select().from(schema.presentations).where(and(eq(schema.presentations.id, id), eq(schema.presentations.workspaceId, workspaceId))).get();
}

export function getPresentationByShare(token: string): PresRow | undefined {
  return getDb().select().from(schema.presentations).where(eq(schema.presentations.shareToken, token)).get();
}

export function deckOf(row: PresRow): DeckT {
  try {
    return Deck.parse(JSON.parse(row.content));
  } catch (cause) {
    throw new Error(`Invalid deck data for presentation ${row.id}`, { cause });
  }
}

export function createPresentation(opts: { title?: string; folderId?: string | null; deck?: DeckT; kind?: ProjectKind; workspaceId?: string } = {}) {
  const now = Date.now();
  const workspaceId = opts.workspaceId ?? DEFAULT_WORKSPACE_ID;
  const kind = opts.kind ?? 'presentation';
  const title = opts.title ?? DEFAULT_PROJECT_TITLES[kind];
  if (!folderOk(opts.folderId, workspaceId)) throw new FolderNotFoundError();
  const folderId = opts.folderId ?? null;
  const deck = opts.deck ?? starterDeck(title, kind);
  const row = {
    id: 'p_' + nanoid(12),
    workspaceId,
    folderId,
    title,
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

export function updatePresentation(id: string, workspaceId: string, patch: Partial<{ title: string; content: DeckT; folderId: string | null }>) {
  const cur = getPresentation(id, workspaceId);
  if (!cur) return undefined;
  const set: Record<string, unknown> = { updatedAt: Date.now() };
  if (patch.title !== undefined) set.title = patch.title;
  if (patch.folderId !== undefined) {
    if (!folderOk(patch.folderId, cur.workspaceId)) throw new FolderNotFoundError();
    set.folderId = patch.folderId;
  }
  if (patch.content !== undefined) set.content = JSON.stringify(Deck.parse(patch.content));
  getDb().update(schema.presentations).set(set).where(and(eq(schema.presentations.id, id), eq(schema.presentations.workspaceId, workspaceId))).run();
  return getPresentation(id, workspaceId);
}

export function duplicatePresentation(id: string, workspaceId: string) {
  const src = getPresentation(id, workspaceId);
  if (!src) return undefined;
  const now = Date.now();
  const row = { ...src, id: 'p_' + nanoid(12), title: src.title + ' (copy)', shareToken: null, published: 0, createdAt: now, updatedAt: now, position: now };
  getDb().insert(schema.presentations).values(row).run();
  return row;
}

export function trashPresentation(id: string, workspaceId: string) {
  return getDb().update(schema.presentations).set({ deletedAt: Date.now() }).where(and(eq(schema.presentations.id, id), eq(schema.presentations.workspaceId, workspaceId))).run().changes > 0;
}

export function restorePresentation(id: string, workspaceId: string) {
  return getDb().update(schema.presentations).set({ deletedAt: null }).where(and(eq(schema.presentations.id, id), eq(schema.presentations.workspaceId, workspaceId))).run().changes > 0;
}

export function destroyPresentation(id: string, workspaceId: string) {
  return getDb().delete(schema.presentations).where(and(eq(schema.presentations.id, id), eq(schema.presentations.workspaceId, workspaceId))).run().changes > 0;
}

export function setShare(id: string, on: boolean, workspaceId: string) {
  if (!getPresentation(id, workspaceId)) return undefined;
  const token = on ? 's_' + nanoid(16) : null;
  getDb().update(schema.presentations).set({ shareToken: token, published: on ? 1 : 0 }).where(and(eq(schema.presentations.id, id), eq(schema.presentations.workspaceId, workspaceId))).run();
  return token;
}
