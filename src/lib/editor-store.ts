'use client';
import { create } from 'zustand';
import { temporal } from 'zundo';
import { nanoid } from 'nanoid';
import { Block, type Deck, type Slide, type BlockType, STAGE_W, STAGE_H } from '@/types/deck';

const uid = () => 'b_' + nanoid(10);
const sid = () => 's_' + nanoid(10);

type State = {
  id: string;
  title: string;
  deck: Deck;
  current: number;       // slide index
  selection: string[];   // block ids
  // meta (not tracked by undo)
  saving: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved: number;
};

type Actions = {
  load: (id: string, title: string, deck: Deck) => void;
  setTitle: (t: string) => void;
  setSaving: (s: State['saving']) => void;
  // slides
  goto: (i: number) => void;
  addSlide: (afterIndex?: number) => void;
  duplicateSlide: (i: number) => void;
  deleteSlide: (i: number) => void;
  reorderSlides: (from: number, to: number) => void;
  setBackground: (patch: Partial<Slide['background']>) => void;
  setNotes: (notes: string) => void;
  // blocks
  select: (ids: string[]) => void;
  addBlock: (type: BlockType, patch?: Partial<Block>) => void;
  addBlockObject: (block: Block) => void;
  updateBlock: (id: string, patch: Partial<Block>) => void;
  updateBlockOnSlide: (slideId: string, id: string, patch: Partial<Block>) => void;
  setCell: (id: string, r: number, c: number, value: string) => void;
  updateSelected: (patch: Partial<Block>) => void;
  deleteBlock: (id: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  reorderZ: (id: string, dir: 'front' | 'back' | 'forward' | 'backward') => void;
  nudge: (dx: number, dy: number) => void;
};

export type EditorStore = State & Actions;

const DEFAULTS: Record<BlockType, Partial<Block>> = {
  text: { w: 800, h: 160, html: '<p>Text</p>', fontSize: 48 } as Partial<Block>,
  image: { w: 640, h: 420 } as Partial<Block>,
  shape: { w: 360, h: 360 } as Partial<Block>,
  table: { w: 900, h: 400 } as Partial<Block>,
  embed: { w: 900, h: 520 } as Partial<Block>,
  chart: { w: 800, h: 520 } as Partial<Block>,
};

function makeBlock(type: BlockType, patch?: Partial<Block>): Block {
  const base = { id: uid(), type, x: (STAGE_W - (DEFAULTS[type].w ?? 600)) / 2, y: (STAGE_H - (DEFAULTS[type].h ?? 300)) / 2, ...DEFAULTS[type], ...patch } as Record<string, unknown>;
  if (type === 'table' && !base.cells) {
    const rows = (base.rows as number) ?? 3, cols = (base.cols as number) ?? 3;
    base.cells = Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (__, c) => (r === 0 ? `Header ${c + 1}` : '')));
  }
  return Block.parse(base);
}

function withSlides(deck: Deck, fn: (slides: Slide[]) => Slide[]): Deck {
  return { ...deck, slides: fn(deck.slides.map((s) => ({ ...s }))) };
}
function patchSlide(deck: Deck, i: number, fn: (s: Slide) => Slide): Deck {
  return withSlides(deck, (slides) => slides.map((s, idx) => (idx === i ? fn(s) : s)));
}
function patchSlideById(deck: Deck, slideId: string, fn: (s: Slide) => Slide): Deck {
  return withSlides(deck, (slides) => slides.map((s) => (s.id === slideId ? fn(s) : s)));
}

// Deep-copy a block so a duplicate never aliases the original's nested arrays
// (table cells, chart labels/series) — otherwise editing one mutates the other.
function cloneBlock(b: Block): Block {
  const c = { ...b, id: uid() } as Block;
  if (c.type === 'table') c.cells = c.cells.map((row) => [...row]);
  if (c.type === 'chart') { c.labels = [...c.labels]; c.series = [...c.series]; }
  return c;
}

export const useEditor = create<EditorStore>()(
  temporal(
    (set, get) => ({
      id: '', title: '', deck: { version: 1, theme: {} as Deck['theme'], slides: [] }, current: 0, selection: [],
      saving: 'idle', lastSaved: 0,

      load: (id, title, deck) => set({ id, title, deck, current: 0, selection: [] }),
      setTitle: (title) => set({ title }),
      setSaving: (saving) => set({ saving, lastSaved: saving === 'saved' ? Date.now() : get().lastSaved }),

      goto: (i) => set((st) => ({ current: Math.max(0, Math.min(i, st.deck.slides.length - 1)), selection: [] })),

      addSlide: (afterIndex) => set((st) => {
        const at = (afterIndex ?? st.current) + 1;
        const blank: Slide = { id: sid(), background: st.deck.slides[st.current]?.background ?? { type: 'color', color: '#faf9f5' } as Slide['background'], blocks: [], notes: '', transition: 'fade' };
        const slides = [...st.deck.slides]; slides.splice(at, 0, blank);
        return { deck: { ...st.deck, slides }, current: at, selection: [] };
      }),
      duplicateSlide: (i) => set((st) => {
        const src = st.deck.slides[i]; if (!src) return {};
        const copy: Slide = { ...src, id: sid(), blocks: src.blocks.map(cloneBlock) };
        const slides = [...st.deck.slides]; slides.splice(i + 1, 0, copy);
        return { deck: { ...st.deck, slides }, current: i + 1, selection: [] };
      }),
      deleteSlide: (i) => set((st) => {
        if (st.deck.slides.length <= 1) return {};
        const slides = st.deck.slides.filter((_, idx) => idx !== i);
        return { deck: { ...st.deck, slides }, current: Math.max(0, Math.min(st.current, slides.length - 1)), selection: [] };
      }),
      reorderSlides: (from, to) => set((st) => {
        // Keep the slide the user was viewing selected after the move.
        const viewedId = st.deck.slides[st.current]?.id;
        const slides = [...st.deck.slides]; const [m] = slides.splice(from, 1); slides.splice(to, 0, m);
        const current = Math.max(0, slides.findIndex((s) => s.id === viewedId));
        return { deck: { ...st.deck, slides }, current, selection: [] };
      }),
      setBackground: (patch) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, background: { ...s.background, ...patch } })) })),
      setNotes: (notes) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, notes })) })),

      select: (ids) => set({ selection: ids }),
      addBlock: (type, patch) => set((st) => {
        const block = makeBlock(type, { z: (maxZ(st.deck.slides[st.current]) + 1), ...patch });
        return { deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: [...s.blocks, block] })), selection: [block.id] };
      }),
      addBlockObject: (block) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: [...s.blocks, block] })), selection: [block.id] })),
      updateBlock: (id, patch) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) })) })),
      // Commit to a block by its slide id (used by inline text edit so a late
      // blur can't land on whatever slide happens to be current now).
      updateBlockOnSlide: (slideId, id, patch) => set((st) => ({ deck: patchSlideById(st.deck, slideId, (s) => ({ ...s, blocks: s.blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)) })) })),
      setCell: (id, r, c, value) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: s.blocks.map((b) => {
        if (b.id !== id || b.type !== 'table') return b;
        const cells = Array.from({ length: b.rows }, (_, ri) => Array.from({ length: b.cols }, (__, ci) => b.cells[ri]?.[ci] ?? ''));
        cells[r][c] = value;
        return { ...b, cells };
      }) })) })),
      updateSelected: (patch) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: s.blocks.map((b) => (st.selection.includes(b.id) ? ({ ...b, ...patch } as Block) : b)) })) })),
      deleteBlock: (id) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== id) })), selection: st.selection.filter((x) => x !== id) })),
      deleteSelected: () => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: s.blocks.filter((b) => !st.selection.includes(b.id) || b.locked) })), selection: [] })),
      duplicateSelected: () => set((st) => {
        const s = st.deck.slides[st.current];
        const dupes = s.blocks.filter((b) => st.selection.includes(b.id)).map((b) => ({ ...cloneBlock(b), x: b.x + 40, y: b.y + 40, z: maxZ(s) + 1 } as Block));
        if (!dupes.length) return {};
        return { deck: patchSlide(st.deck, st.current, (sl) => ({ ...sl, blocks: [...sl.blocks, ...dupes] })), selection: dupes.map((d) => d.id) };
      }),
      reorderZ: (id, dir) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => {
        const sorted = [...s.blocks].sort((a, b) => a.z - b.z);
        const idx = sorted.findIndex((b) => b.id === id); if (idx < 0) return s;
        if (dir === 'front') sorted.push(sorted.splice(idx, 1)[0]);
        else if (dir === 'back') sorted.unshift(sorted.splice(idx, 1)[0]);
        else if (dir === 'forward' && idx < sorted.length - 1) sorted.splice(idx + 1, 0, sorted.splice(idx, 1)[0]);
        else if (dir === 'backward' && idx > 0) sorted.splice(idx - 1, 0, sorted.splice(idx, 1)[0]);
        return { ...s, blocks: sorted.map((b, i) => ({ ...b, z: i })) };
      }) })),
      nudge: (dx, dy) => set((st) => ({ deck: patchSlide(st.deck, st.current, (s) => ({ ...s, blocks: s.blocks.map((b) => (st.selection.includes(b.id) && !b.locked ? { ...b, x: b.x + dx, y: b.y + dy } : b)) })) })),
    }),
    {
      limit: 100,
      // Only deck changes participate in undo/redo history.
      partialize: (s) => ({ deck: s.deck }),
      equality: (a, b) => a.deck === b.deck,
    },
  ),
);

function maxZ(slide?: Slide) { return slide && slide.blocks.length ? Math.max(...slide.blocks.map((b) => b.z)) : 0; }
