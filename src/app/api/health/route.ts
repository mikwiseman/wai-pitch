import { NextResponse } from 'next/server';
import { listWorkspaces } from '@/lib/repo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  const workspaces = listWorkspaces();
  if (workspaces.length === 0) {
    return NextResponse.json({ status: 'error', error: 'workspace missing' }, { status: 503 });
  }
  return NextResponse.json(
    { status: 'ok' },
    { headers: { 'cache-control': 'no-store' } },
  );
}
