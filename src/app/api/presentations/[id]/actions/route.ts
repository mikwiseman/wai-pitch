import { NextResponse } from 'next/server';
import { duplicatePresentation, restorePresentation, destroyPresentation, setShare } from '@/lib/repo';

export const runtime = 'nodejs';

// One endpoint for the small presentation actions: { action: duplicate|restore|destroy|share, on? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { action, on } = await req.json().catch(() => ({}));
  switch (action) {
    case 'duplicate': {
      const row = duplicatePresentation(id);
      return NextResponse.json({ id: row?.id });
    }
    case 'restore':
      restorePresentation(id);
      return NextResponse.json({ ok: true });
    case 'destroy':
      destroyPresentation(id);
      return NextResponse.json({ ok: true });
    case 'share': {
      const token = setShare(id, !!on);
      return NextResponse.json({ token });
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
