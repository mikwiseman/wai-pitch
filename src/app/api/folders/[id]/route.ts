import { NextResponse } from 'next/server';
import { renameFolder, deleteFolder } from '@/lib/repo';

export const runtime = 'nodejs';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json().catch(() => ({}));
  if (typeof name === 'string' && name.trim()) renameFolder(id, name.trim());
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  deleteFolder(id);
  return NextResponse.json({ ok: true });
}
