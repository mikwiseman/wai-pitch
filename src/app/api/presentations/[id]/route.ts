import { NextResponse } from 'next/server';
import { getPresentation, updatePresentation, trashPresentation, deckOf } from '@/lib/repo';
import { Deck } from '@/types/deck';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = getPresentation(id);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ...row, content: undefined, deck: deckOf(row) });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const patch: { title?: string; content?: ReturnType<typeof Deck.parse>; folderId?: string | null } = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (body.folderId !== undefined) patch.folderId = body.folderId;
  if (body.deck !== undefined) {
    const parsed = Deck.safeParse(body.deck);
    if (!parsed.success) return NextResponse.json({ error: 'invalid deck', issues: parsed.error.issues }, { status: 400 });
    patch.content = parsed.data;
  }
  const row = updatePresentation(id, patch);
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true, updatedAt: row.updatedAt });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  trashPresentation(id);
  return NextResponse.json({ ok: true });
}
