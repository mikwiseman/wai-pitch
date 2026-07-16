import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { nanoid } from 'nanoid';
import { getApiWorkspace } from '@/lib/api-auth';
import { DATA_DIR } from '@/lib/db/path';

export const runtime = 'nodejs';

const UP_DIR = join(DATA_DIR, 'uploads');
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

// Detect a real raster image from its magic bytes. SVG is intentionally NOT
// accepted — it can carry inline scripts and would be a stored-XSS vector when
// served same-origin.
function sniffExt(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'gif';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (buf.toString('ascii', 4, 8) === 'ftyp' && /avif|avis/.test(buf.toString('ascii', 8, 12))) return 'avif';
  return null;
}

// Store uploaded images on disk; served back via /api/uploads/[name].
export async function POST(req: Request) {
  const access = await getApiWorkspace();
  if ('response' in access) return access.response;
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'no file' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file too large (max 15 MB)' }, { status: 413 });
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return NextResponse.json({ error: 'file too large (max 15 MB)' }, { status: 413 });
  const ext = sniffExt(buf);
  if (!ext) return NextResponse.json({ error: 'unsupported file type (PNG, JPEG, GIF, WebP, AVIF only)' }, { status: 415 });
  const name = `${nanoid(16)}.${ext}`;
  await mkdir(UP_DIR, { recursive: true });
  await writeFile(join(UP_DIR, name), buf);
  return NextResponse.json({ url: `/api/uploads/${name}` });
}
