import { Deck, type Deck as DeckT } from '@/types/deck';

const uid = () => (globalThis.crypto?.randomUUID?.() ?? 'id' + Math.random().toString(36).slice(2));

/** A polished default deck so a new presentation opens with something real. */
export function starterDeck(title: string): DeckT {
  return Deck.parse({
    slides: [
      {
        id: uid(),
        background: { type: 'color', color: '#faf9f5' },
        blocks: [
          { id: uid(), type: 'text', x: 160, y: 380, w: 1300, h: 260, html: `<p>${escapeHtml(title)}</p>`, fontFamily: 'var(--font-serif)', fontSize: 132, color: '#1a1a18', align: 'left', valign: 'top', lineHeight: 1.0, letterSpacing: -0.02 },
          { id: uid(), type: 'text', x: 164, y: 660, w: 1000, h: 80, html: '<p>Add your subtitle here</p>', fontSize: 40, color: '#5f5c54', align: 'left' },
          { id: uid(), type: 'shape', x: 164, y: 350, w: 96, h: 8, shape: 'rect', fill: '#cc785c', radius: 4 },
        ],
      },
      {
        id: uid(),
        background: { type: 'color', color: '#faf9f5' },
        blocks: [
          { id: uid(), type: 'text', x: 160, y: 140, w: 900, h: 120, html: '<p>Agenda</p>', fontFamily: 'var(--font-serif)', fontSize: 88, color: '#1a1a18' },
          { id: uid(), type: 'text', x: 160, y: 320, w: 1300, h: 560, html: '<p>1&nbsp;&nbsp;First point</p><p>2&nbsp;&nbsp;Second point</p><p>3&nbsp;&nbsp;Third point</p>', fontSize: 52, color: '#1a1a18', lineHeight: 1.8 },
        ],
      },
    ],
  });
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}
