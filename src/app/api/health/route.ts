import { NextResponse } from 'next/server';
import { getSqlite } from '@/lib/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const workspace = getSqlite().prepare('SELECT id FROM workspaces LIMIT 1').get();
  if (!workspace) {
    return NextResponse.json({ status: 'error', error: 'workspace missing' }, { status: 503 });
  }
  return NextResponse.json(
    { status: 'ok' },
    { headers: { 'cache-control': 'no-store' } },
  );
}
