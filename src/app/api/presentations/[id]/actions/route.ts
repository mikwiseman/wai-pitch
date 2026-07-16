import { NextResponse } from 'next/server';
import { duplicatePresentation, restorePresentation, destroyPresentation, setShare } from '@/lib/repo';
import { getApiWorkspace } from '@/lib/api-auth';

export const runtime = 'nodejs';

// One endpoint for the small presentation actions: { action: duplicate|restore|destroy|share, on? }
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const { id } = await params;
  const { action, on } = await req.json().catch(() => ({}));
  switch (action) {
    case 'duplicate': {
      const row = duplicatePresentation(id, access.workspace.id);
      return row ? NextResponse.json({ id: row.id }) : NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    case 'restore':
      return restorePresentation(id, access.workspace.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 });
    case 'destroy':
      return destroyPresentation(id, access.workspace.id) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not found' }, { status: 404 });
    case 'share': {
      const token = setShare(id, !!on, access.workspace.id);
      return token !== undefined ? NextResponse.json({ token }) : NextResponse.json({ error: 'not found' }, { status: 404 });
    }
    default:
      return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  }
}
