'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { STAGE_W, STAGE_H, type Block, type Slide, type Deck } from '@/types/deck';
import { fitScale } from '@/lib/scale';
import { useEditor } from '@/lib/editor-store';
import { BlockView, blockFrame } from '@/components/stage/BlockView';
import { slideBackground } from '@/components/stage/SlideView';

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rot';
type Guide = { o: 'v' | 'h'; at: number };
const SNAP = 8;

export function Canvas({ zoom }: { zoom: number }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.4);
  const deck = useEditor((s) => s.deck);
  const current = useEditor((s) => s.current);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const updateBlock = useEditor((s) => s.updateBlock);
  const updateBlockOnSlide = useEditor((s) => s.updateBlockOnSlide);
  const slide: Slide | undefined = deck.slides[current];
  const [guides, setGuides] = useState<Guide[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = boxRef.current; if (!el) return;
    const measure = () => { const r = el.getBoundingClientRect(); setScale(fitScale(r.width - 80, r.height - 80) * zoom); };
    const ro = new ResizeObserver(measure); ro.observe(el); measure();
    return () => ro.disconnect();
  // The store starts without slides and is hydrated after mount. Re-measure
  // when the first real slide arrives, otherwise the initial 0.4 scale can
  // survive forever and crop the canvas in narrow windows.
  }, [zoom, slide?.id]);

  // Exit inline text editing whenever the viewed slide changes.
  useEffect(() => { setEditingId(null); }, [current]);

  const toStage = useCallback((clientX: number, clientY: number) => {
    const surf = boxRef.current!.querySelector('.stage-surface') as HTMLElement;
    const r = surf.getBoundingClientRect();
    return { x: (clientX - r.left) / scale, y: (clientY - r.top) / scale };
  }, [scale]);

  // A gesture (move/resize/rotate) updates the store live for rendering, but we
  // pause undo history for its duration and commit exactly ONE entry on release
  // (otherwise every pointer frame becomes a separate undo step).
  const drag = useRef<null | { mode: 'move' | Handle; id: string; start: { x: number; y: number }; orig: Block; others: Block[]; pre: Deck; moved: boolean }>(null);
  const lastTap = useRef<{ id: string; t: number }>({ id: '', t: 0 });

  const beginGesture = (mode: 'move' | Handle, b: Block, e: React.PointerEvent) => {
    useEditor.temporal.getState().pause();
    drag.current = { mode, id: b.id, start: toStage(e.clientX, e.clientY), orig: b, others: slide!.blocks.filter((x) => x.id !== b.id), pre: useEditor.getState().deck, moved: false };
  };

  const onBlockPointerDown = (e: React.PointerEvent, b: Block) => {
    if (editingId === b.id) return; // let text edit
    e.stopPropagation();
    if (editingId && editingId !== b.id) setEditingId(null); // commit + exit prior edit
    if (b.locked) { select([b.id]); return; }
    // Double-tap a text block to edit inline. (Native dblclick is unreliable
    // here — selecting adds an overlay between the two clicks — and pointerdown
    // doesn't carry a click count, so we time consecutive taps ourselves.)
    const now = Date.now();
    if (b.type === 'text' && lastTap.current.id === b.id && now - lastTap.current.t < 400) {
      lastTap.current = { id: '', t: 0 };
      select([b.id]); setEditingId(b.id); return;
    }
    lastTap.current = { id: b.id, t: now };
    select([b.id]);
    beginGesture('move', b, e);
  };

  const onHandlePointerDown = (e: React.PointerEvent, b: Block, h: Handle) => {
    e.stopPropagation();
    if (b.locked) return;
    beginGesture(h, b, e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const p = toStage(e.clientX, e.clientY);
    const dx = p.x - d.start.x, dy = p.y - d.start.y;
    if (dx !== 0 || dy !== 0) d.moved = true;
    const o = d.orig;
    if (d.mode === 'move') {
      let nx = o.x + dx, ny = o.y + dy;
      const snapped = snapMove(nx, ny, o.w, o.h, d.others);
      nx = snapped.x; ny = snapped.y; setGuides(snapped.guides);
      updateBlock(d.id, { x: Math.round(nx), y: Math.round(ny) });
    } else if (d.mode === 'rot') {
      const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
      let ang = (Math.atan2(p.y - cy, p.x - cx) * 180) / Math.PI + 90;
      if (e.shiftKey) ang = Math.round(ang / 15) * 15;
      updateBlock(d.id, { rotation: Math.round(ang) });
    } else {
      updateBlock(d.id, resizeRotated(d.mode, o, dx, dy, e.shiftKey));
    }
  };

  // Commit the gesture as a single undo step (silent-restore to pre-state, then
  // one recorded set to the final state).
  const endDrag = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setGuides([]);
    const finalDeck = useEditor.getState().deck;
    if (d.moved) useEditor.setState({ deck: d.pre }); // paused → silent
    useEditor.temporal.getState().resume();
    if (d.moved) useEditor.setState({ deck: finalDeck }); // recorded → one entry
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setEditingId(null); select([]); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [select]);

  if (!slide) return null;
  const blocks = [...slide.blocks].sort((a, b) => a.z - b.z);

  return (
    <div ref={boxRef} className="canvas-backdrop" onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerLeave={endDrag}
      onPointerDown={() => { select([]); setEditingId(null); }}
      >
      <div className="stage-surface" style={{ position: 'absolute', top: '50%', left: '50%', width: STAGE_W, height: STAGE_H, transform: `translate(-50%, -50%) scale(${scale})`, transformOrigin: 'center center', background: slideBackground(slide.background) }}>
        {slide.background.type === 'image' && slide.background.image && (
          <img src={slide.background.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: slide.background.imageFit }} />
        )}
        {blocks.map((b) => {
          const selected = selection.includes(b.id);
          const isEditing = editingId === b.id;
          return (
            <div key={b.id} style={{ ...blockFrame(b), cursor: b.locked ? 'default' : 'move' }}
              onPointerDown={(e) => onBlockPointerDown(e, b)}>
              {b.type === 'text' && isEditing
                ? <TextEditor block={b} onDone={(html) => updateBlockOnSlide(slide.id, b.id, { html })} />
                : <BlockView block={b} />}
              {selected && !isEditing && <SelectionChrome block={b} scale={scale} onHandle={onHandlePointerDown} />}
            </div>
          );
        })}
        {/* Snap guides */}
        {guides.map((g, i) => g.o === 'v'
          ? <div key={i} style={{ position: 'absolute', left: g.at, top: 0, bottom: 0, width: 1, background: 'var(--color-clay)', pointerEvents: 'none' }} />
          : <div key={i} style={{ position: 'absolute', top: g.at, left: 0, right: 0, height: 1, background: 'var(--color-clay)', pointerEvents: 'none' }} />
        )}
      </div>
    </div>
  );
}

function SelectionChrome({ block, scale, onHandle }: { block: Block; scale: number; onHandle: (e: React.PointerEvent, b: Block, h: Handle) => void }) {
  const hs = 10 / scale; // handle size in stage px so it looks constant
  const bw = 1.5 / scale;
  const handles: { h: Handle; x: number; y: number; cur: string }[] = [
    { h: 'nw', x: 0, y: 0, cur: 'nwse-resize' }, { h: 'n', x: 0.5, y: 0, cur: 'ns-resize' }, { h: 'ne', x: 1, y: 0, cur: 'nesw-resize' },
    { h: 'e', x: 1, y: 0.5, cur: 'ew-resize' }, { h: 'se', x: 1, y: 1, cur: 'nwse-resize' }, { h: 's', x: 0.5, y: 1, cur: 'ns-resize' },
    { h: 'sw', x: 0, y: 1, cur: 'nesw-resize' }, { h: 'w', x: 0, y: 0.5, cur: 'ew-resize' },
  ];
  const showHandles = !block.locked && !(block.type === 'shape' && block.shape === 'line');
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', outline: `${bw * 2}px solid var(--color-clay)`, outlineOffset: 0 }}>
      {showHandles && handles.map((hd) => (
        <div key={hd.h} onPointerDown={(e) => onHandle(e, block, hd.h)} style={{
          position: 'absolute', left: `${hd.x * 100}%`, top: `${hd.y * 100}%`, width: hs, height: hs,
          transform: 'translate(-50%,-50%)', background: '#fff', border: `${bw}px solid var(--color-clay)`, borderRadius: 2,
          pointerEvents: 'auto', cursor: hd.cur,
        }} />
      ))}
      {!block.locked && (
        <div onPointerDown={(e) => onHandle(e, block, 'rot')} style={{ position: 'absolute', left: '50%', top: -28 / scale, width: hs, height: hs, transform: 'translate(-50%,-50%)', background: 'var(--color-clay)', borderRadius: '50%', pointerEvents: 'auto', cursor: 'grab' }} />
      )}
    </div>
  );
}

function TextEditor({ block, onDone }: { block: Extract<Block, { type: 'text' }>; onDone: (html: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const latest = useRef(block.html);
  // Uncontrolled: seed content once via the DOM (never dangerouslySetInnerHTML,
  // which React re-applies on re-render and wipes edits). Focus + caret to end.
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.innerHTML = block.html;
    const focusEnd = () => {
      el.focus();
      const r = document.createRange(); r.selectNodeContents(el); r.collapse(false);
      const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
    };
    focusEnd();
    const raf = requestAnimationFrame(focusEnd);
    return () => { cancelAnimationFrame(raf); onDone(latest.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex',
      justifyContent: block.align === 'center' ? 'center' : block.align === 'right' ? 'flex-end' : 'flex-start',
      alignItems: block.valign === 'middle' ? 'center' : block.valign === 'bottom' ? 'flex-end' : 'flex-start',
      background: block.background, padding: `${block.paddingY}px ${block.paddingX}px` }}>
      <div ref={ref} contentEditable suppressContentEditableWarning
        onPointerDown={(e) => e.stopPropagation()}
        onInput={(e) => { latest.current = e.currentTarget.innerHTML; }}
        onBlur={(e) => onDone(e.currentTarget.innerHTML)}
        className="block-text" style={{ width: '100%', outline: 'none', fontFamily: block.fontFamily, fontSize: block.fontSize, color: block.color, textAlign: block.align, lineHeight: block.lineHeight, letterSpacing: block.letterSpacing, fontWeight: block.bold ? 700 : 400 }} />
    </div>
  );
}

// ── snapping ────────────────────────────────────────────────────────────────
function snapMove(x: number, y: number, w: number, h: number, others: Block[]) {
  const guides: Guide[] = [];
  const vTargets = [0, STAGE_W / 2, STAGE_W, ...others.flatMap((b) => [b.x, b.x + b.w / 2, b.x + b.w])];
  const hTargets = [0, STAGE_H / 2, STAGE_H, ...others.flatMap((b) => [b.y, b.y + b.h / 2, b.y + b.h])];
  const vLines = [x, x + w / 2, x + w];
  const hLines = [y, y + h / 2, y + h];
  let bestV: { d: number; delta: number; at: number } | null = null;
  vLines.forEach((line) => { vTargets.forEach((t) => { const d = Math.abs(line - t); if (d < SNAP && (!bestV || d < bestV.d)) bestV = { d, delta: t - line, at: t }; }); });
  let bestH: { d: number; delta: number; at: number } | null = null;
  hLines.forEach((line) => { hTargets.forEach((t) => { const d = Math.abs(line - t); if (d < SNAP && (!bestH || d < bestH.d)) bestH = { d, delta: t - line, at: t }; }); });
  if (bestV) { x += (bestV as { delta: number }).delta; guides.push({ o: 'v', at: (bestV as { at: number }).at }); }
  if (bestH) { y += (bestH as { delta: number }).delta; guides.push({ o: 'h', at: (bestH as { at: number }).at }); }
  return { x, y, guides };
}

// Resize honoring rotation: the pointer delta is rotated into the block's local
// frame, width/height change there, and the block's top-left is recomputed so the
// handle opposite the one being dragged stays put in screen space.
function resizeRotated(h: Handle, o: Block, dx: number, dy: number, keepAspect: boolean): Partial<Block> {
  const minW = 24, minH = 24;
  const sign: Record<string, [number, number]> = {
    e: [1, 0], w: [-1, 0], s: [0, 1], n: [0, -1], ne: [1, -1], nw: [-1, -1], se: [1, 1], sw: [-1, 1],
  };
  const [hx, hy] = sign[h] ?? [0, 0];
  const rad = ((o.rotation || 0) * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  // Rotate world delta into the block's local axes.
  const ldx = dx * cos + dy * sin;
  const ldy = -dx * sin + dy * cos;

  let w = hx !== 0 ? Math.max(minW, o.w + hx * ldx) : o.w;
  let hh = hy !== 0 ? Math.max(minH, o.h + hy * ldy) : o.h;
  if (keepAspect && hx !== 0 && hy !== 0) {
    const ar = o.w / o.h;
    hh = w / ar;
  }
  // Local-space shift of the center so the opposite anchor stays fixed.
  const lcx = (hx * (w - o.w)) / 2;
  const lcy = (hy * (hh - o.h)) / 2;
  // Back to world space.
  const wcx = lcx * cos - lcy * sin;
  const wcy = lcx * sin + lcy * cos;
  const cx = o.x + o.w / 2 + wcx;
  const cy = o.y + o.h / 2 + wcy;
  return { x: Math.round(cx - w / 2), y: Math.round(cy - hh / 2), w: Math.round(w), h: Math.round(hh) };
}
