import 'server-only';
import { PptxRenderer } from 'pptx-svg';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { Deck, type Block, type Deck as DeckT } from '@/types/deck';
import { DATA_DIR } from '@/lib/db/path';
import { svgSlideToDeckSlide } from './pptx-svg.mjs';
import { validatePptxArchive } from './pptx-archive.mjs';

export type PptxImportReport = {
  slides: number;
  hiddenSlidesSkipped: number;
  editable: { text: number; shapes: number; images: number };
  flattened: number;
  unsupported: string[];
};

let wasmBytesPromise: Promise<Buffer> | null = null;

function loadWasm() {
  if (!wasmBytesPromise) {
    const wasmPath = join(process.cwd(), 'node_modules', 'pptx-svg', 'dist', 'main.wasm');
    wasmBytesPromise = readFile(wasmPath);
  }
  return wasmBytesPromise;
}

function svgFallbackDataUri(fragment: string, fallback: { x: number; y: number; w: number; h: number }, svg: string) {
  const width = Number(svg.match(/<svg[^>]*\bwidth="([\d.]+)"/)?.[1] || 960);
  const height = Number(svg.match(/<svg[^>]*\bheight="([\d.]+)"/)?.[1] || 540);
  const scaleX = 1920 / width;
  const scaleY = 1080 / height;
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="${fallback.w}" height="${fallback.h}" viewBox="${fallback.x / scaleX} ${fallback.y / scaleY} ${fallback.w / scaleX} ${fallback.h / scaleY}">${fragment}</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(wrapped).toString('base64')}`;
}

async function persistRasterImages(deck: DeckT) {
  const uploads = join(DATA_DIR, 'uploads');
  await mkdir(uploads, { recursive: true });
  const mimeToExt: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/avif': 'avif' };
  for (const slide of deck.slides) {
    for (const block of slide.blocks) {
      if (block.type !== 'image') continue;
      const match = block.src.match(/^data:(image\/(?:png|jpeg|gif|webp|avif));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) continue;
      const bytes = Buffer.from(match[2], 'base64');
      const ext = mimeToExt[match[1]];
      const name = `import-${createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.${ext}`;
      await writeFile(join(uploads, name), bytes, { flag: 'wx' }).catch((cause: NodeJS.ErrnoException) => {
        if (cause.code !== 'EEXIST') throw cause;
      });
      block.src = `/api/uploads/${name}`;
    }
  }
}

export async function importPptx(buffer: Buffer): Promise<{ deck: DeckT; report: PptxImportReport }> {
  validatePptxArchive(buffer);

  const renderer = new PptxRenderer({ logLevel: 'error' });
  await renderer.init(await loadWasm());
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const { slideCount } = await renderer.loadPptx(arrayBuffer);
  if (slideCount < 1) throw new Error('The PPTX contains no slides');
  if (slideCount > 300) throw new Error('The PPTX has more than 300 slides; split it before importing');

  const slides = [];
  const report: PptxImportReport = {
    slides: 0,
    hiddenSlidesSkipped: 0,
    editable: { text: 0, shapes: 0, images: 0 },
    flattened: 0,
    unsupported: [],
  };

  for (let index = 0; index < slideCount; index += 1) {
    if (renderer.isSlideHidden(index)) {
      report.hiddenSlidesSkipped += 1;
      continue;
    }
    const svg = renderer.renderSlideSvg(index);
    const converted = svgSlideToDeckSlide(svg, {
      slideId: `pptx-slide-${index + 1}-${crypto.randomUUID().slice(0, 8)}`,
      notes: renderer.getSlideNotes(index).join('\n'),
    });
    const convertedBlocks = converted.slide.blocks as Block[];
    for (const fallback of converted.fallbacks) {
      const fragment = renderer.renderShapeSvg(index, fallback.shapeIndex);
      if (fragment.startsWith('ERROR:')) throw new Error(`Could not preserve ${fallback.shapeType} on slide ${index + 1}: ${fragment}`);
      const block: Block = {
        id: `pptx-fallback-${index}-${fallback.shapeIndex}`,
        type: 'image',
        x: fallback.x,
        y: fallback.y,
        w: fallback.w,
        h: fallback.h,
        rotation: fallback.rotation,
        opacity: 1,
        z: fallback.order * 2,
        locked: true,
        src: svgFallbackDataUri(fragment, fallback, svg),
        fit: 'fill',
        radius: 0,
        alt: `${fallback.shapeType} imported as a locked visual`,
      };
      convertedBlocks.push(block);
    }
    convertedBlocks.sort((a, b) => a.z - b.z);
    slides.push(converted.slide);
    report.slides += 1;
    report.editable.text += converted.report.editable.text;
    report.editable.shapes += converted.report.editable.shapes;
    report.editable.images += converted.report.editable.images;
    report.flattened += converted.report.flattened;
    for (const unsupported of converted.report.unsupported) {
      if (!report.unsupported.includes(unsupported)) report.unsupported.push(unsupported);
    }
  }

  if (slides.length === 0) throw new Error('Every slide in this PPTX is hidden');
  const deck = Deck.parse({
    version: 1,
    theme: { name: 'Imported PowerPoint', fontHeading: 'Inter', fontBody: 'Inter', accent: '#6d5dfc', paper: '#ffffff', ink: '#152229' },
    slides,
  });
  await persistRasterImages(deck);
  return { deck, report };
}
