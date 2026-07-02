import { Deck, Block, type Deck as DeckT, type Slide } from '@/types/deck';
import { z } from 'zod';

const uid = () => (globalThis.crypto?.randomUUID?.() ?? 'id' + Math.random().toString(36).slice(2));

// Semantic outline the model produces; we compose positioned blocks from it so
// layout quality doesn't depend on the model guessing pixel coordinates.
export const OutlineSlide = z.object({
  layout: z.enum(['title', 'section', 'bullets', 'statement', 'quote', 'twoColumn']).default('bullets'),
  title: z.string().default(''),
  subtitle: z.string().default(''),
  bullets: z.array(z.string()).default([]),
  body: z.string().default(''),
  attribution: z.string().default(''),
  columns: z.array(z.object({ heading: z.string().default(''), body: z.string().default('') })).default([]),
  notes: z.string().default(''),
});
export const Outline = z.object({
  title: z.string().default('Untitled'),
  accent: z.string().default('#cc785c'),
  slides: z.array(OutlineSlide).min(1),
});
export type Outline = z.infer<typeof Outline>;

const PAPER = '#faf9f5';
const INK = '#1a1a18';
const INK2 = '#5f5c54';
const M = 160; // margin
const SERIF = 'var(--font-serif)';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!));
const para = (s: string) => `<p>${esc(s)}</p>`;

function accentBar(y: number, accent: string): Block {
  return Block.parse({ id: uid(), type: 'shape', x: M + 4, y, w: 96, h: 8, shape: 'rect', fill: accent, radius: 4 });
}

function composeSlide(s: z.infer<typeof OutlineSlide>, accent: string, index: number): Slide {
  const blocks: Block[] = [];
  switch (s.layout) {
    case 'title':
      blocks.push(accentBar(360, accent));
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 390, w: 1500, h: 300, html: para(s.title), fontFamily: SERIF, fontSize: 128, color: INK, lineHeight: 1.0, letterSpacing: -0.02 }));
      if (s.subtitle) blocks.push(Block.parse({ id: uid(), type: 'text', x: M + 4, y: 700, w: 1300, h: 90, html: para(s.subtitle), fontSize: 44, color: INK2 }));
      break;
    case 'section':
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 300, w: 300, h: 120, html: para(String(index).padStart(2, '0')), fontFamily: SERIF, fontSize: 96, color: accent }));
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 440, w: 1500, h: 280, html: para(s.title), fontFamily: SERIF, fontSize: 104, color: INK, lineHeight: 1.05, letterSpacing: -0.02 }));
      if (s.subtitle) blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 720, w: 1300, h: 120, html: para(s.subtitle), fontSize: 40, color: INK2, lineHeight: 1.5 }));
      break;
    case 'statement':
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 300, w: 1600, h: 480, html: para(s.title || s.body), fontFamily: SERIF, fontSize: 96, color: INK, align: 'left', valign: 'middle', lineHeight: 1.1, letterSpacing: -0.01 }));
      break;
    case 'quote':
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 260, w: 260, h: 260, html: '<p>“</p>', fontFamily: SERIF, fontSize: 240, color: accent, lineHeight: 1 }));
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 400, w: 1600, h: 380, html: para(s.body || s.title), fontFamily: SERIF, fontSize: 72, color: INK, lineHeight: 1.2 }));
      if (s.attribution) blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 800, w: 1200, h: 70, html: para('— ' + s.attribution), fontSize: 36, color: INK2 }));
      break;
    case 'twoColumn': {
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 150, w: 1500, h: 130, html: para(s.title), fontFamily: SERIF, fontSize: 80, color: INK }));
      const cols = s.columns.length ? s.columns : [{ heading: '', body: s.body }];
      const colW = (1920 - M * 2 - 80) / Math.min(2, cols.length || 1);
      cols.slice(0, 2).forEach((c, i) => {
        const x = M + i * (colW + 80);
        if (c.heading) blocks.push(Block.parse({ id: uid(), type: 'text', x, y: 350, w: colW, h: 80, html: para(c.heading), fontSize: 40, color: accent, bold: true }));
        blocks.push(Block.parse({ id: uid(), type: 'text', x, y: 450, w: colW, h: 460, html: para(c.body), fontSize: 34, color: INK, lineHeight: 1.5 }));
      });
      break;
    }
    case 'bullets':
    default: {
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 150, w: 1500, h: 140, html: para(s.title), fontFamily: SERIF, fontSize: 84, color: INK }));
      if (s.subtitle) blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: 300, w: 1400, h: 70, html: para(s.subtitle), fontSize: 36, color: INK2 }));
      const listHtml = s.bullets.map((b) => `<p>•&nbsp;&nbsp;${esc(b)}</p>`).join('');
      blocks.push(Block.parse({ id: uid(), type: 'text', x: M, y: s.subtitle ? 400 : 340, w: 1600, h: 560, html: listHtml || para(s.body), fontSize: 44, color: INK, lineHeight: 1.7 }));
      break;
    }
  }
  return { id: uid(), background: { type: 'color', color: PAPER } as Slide['background'], blocks, notes: s.notes, transition: 'fade' } as Slide;
}

export function composeDeck(outline: Outline): DeckT {
  const slides = outline.slides.map((s, i) => composeSlide(s, outline.accent, i + 1));
  return Deck.parse({ theme: { name: 'Claude Paper', accent: outline.accent }, slides });
}
