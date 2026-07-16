import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id'),
  name: text('name').notNull(),
  color: text('color').notNull().default('#cc785c'),
  createdAt: integer('created_at').notNull(),
});

export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  parentId: text('parent_id'),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const presentations = sqliteTable('presentations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  folderId: text('folder_id'),
  title: text('title').notNull().default('Untitled'),
  content: text('content').notNull(), // JSON Deck
  shareToken: text('share_token'),
  published: integer('published').notNull().default(0),
  position: integer('position').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

export type WorkspaceRow = typeof workspaces.$inferSelect;
export type FolderRow = typeof folders.$inferSelect;
export type PresentationRow = typeof presentations.$inferSelect;
