import { NextResponse } from 'next/server';
import { createPresentation, listPresentations, deckOf, FolderNotFoundError } from '@/lib/repo';
import { Deck } from '@/types/deck';
import { isProjectKind } from '@/lib/starter';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trashed = url.searchParams.get('trashed') === '1';
  const folderId = url.searchParams.has('folderId') ? (url.searchParams.get('folderId') || null) : undefined;
  const rows = listPresentations({ trashed, folderId });
  // Attach first-slide thumbnail + slide count so cards render live previews
  // without shipping the full deck (or the share token) to the client.
  return NextResponse.json(rows.map((r) => {
    const deck = deckOf(r);
    return {
      id: r.id, title: r.title, folderId: r.folderId, workspaceId: r.workspaceId,
      published: r.published,
      createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
      slideCount: deck.slides.length, thumb: deck.slides[0] ?? null,
    };
  }));
}

export async function POST(req: Request) {
  const raw = await req.json().catch(() => ({}));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 });
  }
  const body = raw as Record<string, unknown>;
  if (body.kind !== undefined && !isProjectKind(body.kind)) {
    return NextResponse.json({ error: 'invalid project kind' }, { status: 400 });
  }
  // If a deck is supplied, validate it (matches the PUT path) rather than
  // persisting something that would later silently reset to an empty deck.
  let deck;
  if (body.deck !== undefined) {
    const parsed = Deck.safeParse(body.deck);
    if (!parsed.success) return NextResponse.json({ error: 'invalid deck' }, { status: 400 });
    deck = parsed.data;
  }
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : undefined;
  const folderId = typeof body.folderId === 'string' || body.folderId === null ? body.folderId : null;
  try {
    const row = createPresentation({ title, folderId, deck, kind: body.kind });
    return NextResponse.json({ id: row.id });
  } catch (cause) {
    if (cause instanceof FolderNotFoundError) {
      return NextResponse.json({ error: cause.message }, { status: 400 });
    }
    throw cause;
  }
}
