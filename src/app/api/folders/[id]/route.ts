import { NextResponse } from 'next/server';
import { renameFolder, deleteFolder } from '@/lib/repo';
import { getApiWorkspace } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const { id } = await params;
  const { name } = await req.json().catch(() => ({}));
  if (typeof name !== 'string' || !name.trim()) return NextResponse.json({ error: 'folder name required' }, { status: 400 });
  return renameFolder(id, name.trim(), access.workspace.id)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'not found' }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const { id } = await params;
  return deleteFolder(id, access.workspace.id)
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: 'not found' }, { status: 404 });
}
