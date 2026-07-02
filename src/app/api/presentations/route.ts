import { NextResponse } from 'next/server';
import { createPresentation, listPresentations, deckOf } from '@/lib/repo';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const trashed = url.searchParams.get('trashed') === '1';
  const folderId = url.searchParams.has('folderId') ? (url.searchParams.get('folderId') || null) : undefined;
  const rows = listPresentations({ trashed, folderId });
  // Attach first-slide thumbnail + slide count so cards render live previews
  // without shipping the full deck to the client.
  return NextResponse.json(rows.map((r) => {
    const deck = deckOf(r);
    return {
      id: r.id, title: r.title, folderId: r.folderId, workspaceId: r.workspaceId,
      shareToken: r.shareToken, published: r.published,
      createdAt: r.createdAt, updatedAt: r.updatedAt, deletedAt: r.deletedAt,
      slideCount: deck.slides.length, thumb: deck.slides[0] ?? null,
    };
  }));
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const row = createPresentation({ title: body.title, folderId: body.folderId ?? null, deck: body.deck });
  return NextResponse.json({ id: row.id });
}
