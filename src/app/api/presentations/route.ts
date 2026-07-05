import { NextResponse } from 'next/server';
import { createPresentation, listPresentations, deckOf } from '@/lib/repo';
import { Deck } from '@/types/deck';

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
  const body = await req.json().catch(() => ({}));
  // If a deck is supplied, validate it (matches the PUT path) rather than
  // persisting something that would later silently reset to an empty deck.
  let deck;
  if (body.deck !== undefined) {
    const parsed = Deck.safeParse(body.deck);
    if (!parsed.success) return NextResponse.json({ error: 'invalid deck' }, { status: 400 });
    deck = parsed.data;
  }
  const title = typeof body.title === 'string' ? body.title.slice(0, 200) : undefined;
  const row = createPresentation({ title, folderId: body.folderId ?? null, deck });
  return NextResponse.json({ id: row.id });
}
