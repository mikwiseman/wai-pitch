import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

const UP_DIR = join(process.cwd(), 'data', 'uploads');

// Store uploaded images on disk; served back via /api/uploads/[name].
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const name = `${nanoid(16)}.${ext}`;
  await mkdir(UP_DIR, { recursive: true });
  await writeFile(join(UP_DIR, name), buf);
  return NextResponse.json({ url: `/api/uploads/${name}` });
}
