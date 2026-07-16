import { NextResponse } from 'next/server';
import { listFolders, createFolder } from '@/lib/repo';
import { getApiWorkspace } from '@/lib/api-auth';

export const runtime = 'nodejs';

export async function GET() {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  return NextResponse.json(listFolders(access.workspace.id));
}

export async function POST(req: Request) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const { name, parentId } = await req.json().catch(() => ({}));
  const row = createFolder((name || 'New folder').trim(), parentId ?? null, access.workspace.id);
  return NextResponse.json(row);
}
