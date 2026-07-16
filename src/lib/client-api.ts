'use client';
import type { Slide } from '@/types/deck';
import type { ProjectKind } from '@/lib/starter';

export type PresListItem = {
  id: string; title: string; folderId: string | null; workspaceId: string;
  published: number;
  createdAt: number; updatedAt: number; deletedAt: number | null;
  slideCount: number; thumb: Slide | null;
};
export type Folder = { id: string; workspaceId: string; parentId: string | null; name: string; position: number; createdAt: number };

async function jf<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => '')}`);
  return res.json() as Promise<T>;
}

export const api = {
  listPresentations: (opts: { trashed?: boolean; folderId?: string | null } = {}) => {
    const p = new URLSearchParams();
    if (opts.trashed) p.set('trashed', '1');
    if (opts.folderId !== undefined) p.set('folderId', opts.folderId ?? '');
    return jf<PresListItem[]>(`/api/presentations?${p.toString()}`);
  },
  createPresentation: (body: { title?: string; folderId?: string | null; kind?: ProjectKind } = {}) => jf<{ id: string }>(`/api/presentations`, { method: 'POST', body: JSON.stringify(body) }),
  renamePresentation: (id: string, title: string) => jf(`/api/presentations/${id}`, { method: 'PUT', body: JSON.stringify({ title }) }),
  movePresentation: (id: string, folderId: string | null) => jf(`/api/presentations/${id}`, { method: 'PUT', body: JSON.stringify({ folderId }) }),
  trashPresentation: (id: string) => jf(`/api/presentations/${id}`, { method: 'DELETE' }),
  presAction: (id: string, action: 'duplicate' | 'restore' | 'destroy' | 'share', on?: boolean) => jf<{ id?: string; token?: string; ok?: boolean }>(`/api/presentations/${id}/actions`, { method: 'POST', body: JSON.stringify({ action, on }) }),
  listFolders: () => jf<Folder[]>(`/api/folders`),
  createFolder: (name: string, parentId: string | null = null) => jf<Folder>(`/api/folders`, { method: 'POST', body: JSON.stringify({ name, parentId }) }),
  renameFolder: (id: string, name: string) => jf(`/api/folders/${id}`, { method: 'PUT', body: JSON.stringify({ name }) }),
  deleteFolder: (id: string) => jf(`/api/folders/${id}`, { method: 'DELETE' }),
  aiGenerate: (prompt: string, slideCount?: number) => jf<{ id: string; title: string; slides: number }>(`/api/ai/generate`, { method: 'POST', body: JSON.stringify({ prompt, slideCount }) }),
};
