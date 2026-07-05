import { readFile } from 'node:fs/promises';
import { join, basename } from 'node:path';

export const runtime = 'nodejs';

const UP_DIR = join(process.cwd(), 'data', 'uploads');
// Raster image types only. No SVG — it would execute inline scripts if served
// same-origin (uploads are validated by magic bytes on write, so SVG never
// lands here, but the map is kept strict as defense in depth).
const MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif' };

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const safe = basename(name); // prevent path traversal
  const ext = safe.split('.').pop()?.toLowerCase() || '';
  const mime = MIME[ext];
  if (!mime) return new Response('unsupported', { status: 415 });
  try {
    const buf = await readFile(join(UP_DIR, safe));
    return new Response(new Uint8Array(buf), {
      headers: {
        'content-type': mime,
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      },
    });
  } catch {
    return new Response('not found', { status: 404 });
  }
}
