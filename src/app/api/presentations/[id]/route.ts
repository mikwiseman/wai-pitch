import { NextResponse } from 'next/server';
import { getPresentation, updatePresentation, trashPresentation, deckOf, FolderNotFoundError } from '@/lib/repo';
import { Deck } from '@/types/deck';
import { getApiWorkspace } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const { id } = await params;
  const row = getPresentation(id, access.workspace.id);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ...row, content: undefined, deck: deckOf(row) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const { id } = await params;
  const raw = await req.json().catch(() => ({}));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  const patch: { title?: string; content?: ReturnType<typeof Deck.parse>; folderId?: string | null } = {};
  if (typeof body.title === 'string') patch.title = body.title.slice(0, 200);
  if (body.folderId !== undefined) {
    if (typeof body.folderId !== 'string' && body.folderId !== null) {
      return NextResponse.json({ error: 'invalid folder id' }, { status: 400 });
    }
    patch.folderId = body.folderId;
  }
  if (body.deck !== undefined) {
    const parsed = Deck.safeParse(body.deck);
    if (!parsed.success) return NextResponse.json({ error: 'invalid deck' }, { status: 400 });
    patch.content = parsed.data;
  }
  let row;
  try {
    row = updatePresentation(id, access.workspace.id, patch);
  } catch (cause) {
    if (cause instanceof FolderNotFoundError) {
      return NextResponse.json({ error: cause.message }, { status: 400 });
    }
    throw cause;
  }
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const { id } = await params;
  if (!trashPresentation(id, access.workspace.id)) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
