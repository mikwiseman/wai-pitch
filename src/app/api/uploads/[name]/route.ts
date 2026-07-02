import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

export const runtime = 'nodejs';

const UP_DIR = join(process.cwd(), 'data', 'uploads');
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml', avif: 'image/avif' };

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = basename(name); // prevent path traversal
  try {
    const buf = await readFile(join(UP_DIR, safe));
    const ext = safe.split('.').pop()?.toLowerCase() || 'png';
    return new Response(new Uint8Array(buf), {
      headers: { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'public, max-age=31536000, immutable' },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
