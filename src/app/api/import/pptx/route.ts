import { NextResponse } from 'next/server';
import { importPptx } from '@/lib/import/pptx';
import { createPresentation } from '@/lib/repo';
import { getApiWorkspace } from '@/lib/api-auth';

export const runtime = 'nodejs';
export const maxDuration = 120;

const MAX_BYTES = 75 * 1024 * 1024;

export async function POST(req: Request) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a .pptx file' }, { status: 400 });
  if (!file.name.toLowerCase().endsWith('.pptx')) return NextResponse.json({ error: 'Only .pptx files are supported' }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'The file is larger than 75 MB' }, { status: 413 });

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const { deck, report } = await importPptx(bytes);
    const title = file.name.replace(/\.pptx$/i, '').trim().slice(0, 200) || 'Imported presentation';
    const row = createPresentation({ title, deck, workspaceId: access.workspace.id });
    return NextResponse.json({ id: row.id, title: row.title, report });
  } catch (cause) {
    console.error('[import/pptx] failed:', cause);
    const message = cause instanceof Error ? cause.message : 'PPTX import failed';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

