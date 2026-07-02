import { NextResponse } from 'next/server';
import { listFolders, createFolder } from '@/lib/repo';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(listFolders());
}

export async function POST(req: Request) {
  const { name, parentId } = await req.json().catch(() => ({}));
  const row = createFolder((name || 'New folder').trim(), parentId ?? null);
  return NextResponse.json(row);
}
