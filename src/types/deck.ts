import { z } from 'zod';
import { sanitizeHtml } from '@/lib/sanitize-html';

// ─────────────────────────────────────────────────────────────────────────────
// Coordinate system: every slide is a fixed 1920×1080 Stage. Blocks are
// absolutely positioned in stage pixels (x,y = top-left, w,h = size). The Stage
// is transform-scaled to fit any container, so the same data renders identically
// in the editor, player, share view and thumbnails (WYSIWYG by construction).
// ─────────────────────────────────────────────────────────────────────────────

export const STAGE_W = 1920;
export const STAGE_H = 1080;

export const zColor = z.string(); // hex / rgba / css color / 'transparent'

const blockBase = {
  id: z.string(),
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
  rotation: z.number().default(0),
  opacity: z.number().min(0).max(1).default(1),
  z: z.number().default(0),
  locked: z.boolean().default(false),
};

export const TextBlock = z.object({
  ...blockBase,
  type: z.literal('text'),
  // Sanitized on every parse (write + read), so stored & rendered HTML is safe.
  html: z.string().default('<p></p>').transform(sanitizeHtml),
  fontFamily: z.string().default('var(--font-sans)'),
  fontSize: z.number().default(48),
  color: zColor.default('#1a1a18'),
  align: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  valign: z.enum(['top', 'middle', 'bottom']).default('top'),
  lineHeight: z.number().default(1.2),
  letterSpacing: z.number().default(0),
  bold: z.boolean().default(false),
  background: zColor.default('transparent'),
  paddingX: z.number().default(0),
  paddingY: z.number().default(0),
});

export const ImageBlock = z.object({
  ...blockBase,
  type: z.literal('image'),
  src: z.string().default(''),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  radius: z.number().default(0),
  alt: z.string().default(''),
});

export const ShapeBlock = z.object({
  ...blockBase,
  type: z.literal('shape'),
  shape: z.enum(['rect', 'ellipse', 'line', 'triangle']).default('rect'),
  fill: zColor.default('#cc785c'),
  stroke: zColor.default('transparent'),
  strokeWidth: z.number().default(0),
  radius: z.number().default(0),
});

export const TableBlock = z.object({
  ...blockBase,
  type: z.literal('table'),
  rows: z.number().default(3),
  cols: z.number().default(3),
  cells: z.array(z.array(z.string())).default([]),
  headerRow: z.boolean().default(true),
  fontSize: z.number().default(28),
  color: zColor.default('#1a1a18'),
  headerBg: zColor.default('#1a1a18'),
  headerColor: zColor.default('#ffffff'),
  borderColor: zColor.default('#e6e2d9'),
});

export const EmbedBlock = z.object({
  ...blockBase,
  type: z.literal('embed'),
  url: z.string().default(''),
  radius: z.number().default(8),
});

export const ChartBlock = z.object({
  ...blockBase,
  type: z.literal('chart'),
  chart: z.enum(['bar', 'line', 'pie']).default('bar'),
  labels: z.array(z.string()).default(['A', 'B', 'C']),
  series: z.array(z.number()).default([30, 60, 45]),
  color: zColor.default('#cc785c'),
  title: z.string().default(''),
});

export const Block = z.discriminatedUnion('type', [
  TextBlock, ImageBlock, ShapeBlock, TableBlock, EmbedBlock, ChartBlock,
]);
export type Block = z.infer<typeof Block>;
export type BlockType = Block['type'];

export const Background = z.object({
  type: z.enum(['color', 'gradient', 'image']).default('color'),
  color: zColor.default('#faf9f5'),
  gradient: z.string().default('linear-gradient(135deg,#faf9f5,#f0ece1)'),
  image: z.string().default(''),
  imageFit: z.enum(['cover', 'contain']).default('cover'),
});
export type Background = z.infer<typeof Background>;

export const Slide = z.object({
  id: z.string(),
  background: Background.prefault({}),
  blocks: z.array(Block).default([]),
  notes: z.string().default(''),
  transition: z.enum(['none', 'fade', 'slide']).default('fade'),
});
export type Slide = z.infer<typeof Slide>;

export const Theme = z.object({
  name: z.string().default('Claude Paper'),
  fontHeading: z.string().default('var(--font-serif)'),
  fontBody: z.string().default('var(--font-sans)'),
  accent: zColor.default('#cc785c'),
  paper: zColor.default('#faf9f5'),
  ink: zColor.default('#1a1a18'),
});
export type Theme = z.infer<typeof Theme>;

export const Deck = z.object({
  version: z.literal(1).default(1),
  theme: Theme.prefault({}),
  slides: z.array(Slide).min(1),
});
export type Deck = z.infer<typeof Deck>;

// Parse loudly — no silent fallbacks (matches the project's no-fallback rule).
export function parseDeck(data: unknown): Deck {
  return Deck.parse(data);
}

export function emptyDeck(): Deck {
  return Deck.parse({ slides: [{ id: crypto.randomUUID(), blocks: [] }] });
}
