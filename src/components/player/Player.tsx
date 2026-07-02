'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Deck } from '@/types/deck';
import { Stage } from '@/components/stage/Stage';
import { SlideView, slideBackground } from '@/components/stage/SlideView';
import { Icon } from '@/components/icons';

/**
 * Read-only presentation player. Keyboard nav, fullscreen, #N deep links,
 * fade transitions, on-hover chrome. Used by /present/[id] and /v/[token].
 */
export function Player({ deck, title }: { deck: Deck; title?: string }) {
  const n = deck.slides.length;
  const [i, setI] = useState(0);
  const [chrome, setChrome] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const go = useCallback((next: number) => setI((cur) => Math.max(0, Math.min(next, n - 1))), [n]);

  // Deep link via #N (1-based)
  useEffect(() => {
    const fromHash = () => { const h = parseInt(location.hash.replace('#', ''), 10); if (!Number.isNaN(h)) setI(Math.max(0, Math.min(h - 1, n - 1))); };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [n]);
  useEffect(() => { if (location.hash !== `#${i + 1}`) history.replaceState(null, '', `#${i + 1}`); }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['ArrowRight', ' ', 'PageDown', 'ArrowDown'].includes(e.key)) { e.preventDefault(); go(i + 1); }
      else if (['ArrowLeft', 'PageUp', 'ArrowUp'].includes(e.key)) { e.preventDefault(); go(i - 1); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(n - 1);
      else if (e.key.toLowerCase() === 'f') toggleFull();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [i, go, n]);

  const bump = () => { setChrome(true); if (hideTimer.current) clearTimeout(hideTimer.current); hideTimer.current = setTimeout(() => setChrome(false), 2200); };
  useEffect(() => { bump(); return () => { if (hideTimer.current) clearTimeout(hideTimer.current); }; }, []);

  function toggleFull() {
    const el = wrapRef.current; if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.(); else document.exitFullscreen?.();
  }

  const slide = deck.slides[i];
  return (
    <div ref={wrapRef} onMouseMove={bump} onClick={(e) => { const x = e.clientX / window.innerWidth; go(x < 0.35 ? i - 1 : i + 1); }}
      style={{ position: 'fixed', inset: 0, background: '#0b0b0a', display: 'grid', placeItems: 'center', cursor: chrome ? 'default' : 'none' }}>
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        {deck.slides.map((s, idx) => (
          <div key={s.id} style={{ position: 'absolute', inset: 0, opacity: idx === i ? 1 : 0, transition: 'opacity 260ms ease', pointerEvents: idx === i ? 'auto' : 'none', background: slideBackground(s.background) }}>
            {idx === i && <Stage><SlideView slide={s} /></Stage>}
          </div>
        ))}
      </div>

      {/* Chrome */}
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 54, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', background: 'linear-gradient(0deg, rgba(0,0,0,0.55), transparent)', opacity: chrome ? 1 : 0, transition: 'opacity 0.2s', color: '#fff' }}>
        <button className="pl-btn" onClick={() => go(i - 1)} aria-label="Previous"><Icon.Left width={20} /></button>
        <span style={{ fontSize: 13, fontVariantNumeric: 'tabular-nums', minWidth: 70 }}>{i + 1} / {n}</span>
        <button className="pl-btn" onClick={() => go(i + 1)} aria-label="Next"><Icon.Right width={20} /></button>
        {title && <span style={{ fontSize: 13, opacity: 0.7, marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>}
        <div style={{ flex: 1 }} />
        <button className="pl-btn" onClick={() => window.print()} aria-label="Export PDF" title="Export PDF"><Icon.Download width={18} /></button>
        <button className="pl-btn" onClick={toggleFull} aria-label="Fullscreen"><Icon.Full width={18} /></button>
      </div>

      {/* Progress bar */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, height: 3, background: 'rgba(255,255,255,0.12)' }}>
        <div style={{ height: '100%', width: `${((i + 1) / n) * 100}%`, background: 'var(--color-clay)', transition: 'width 0.2s' }} />
      </div>

      {/* Print sheet: every slide stacked for PDF export via browser print */}
      <div className="print-sheet" aria-hidden>
        {deck.slides.map((s) => (
          <div key={s.id} className="print-slide" style={{ background: slideBackground(s.background) }}>
            <Stage><SlideView slide={s} /></Stage>
          </div>
        ))}
      </div>

      <style>{`
        .pl-btn { display:grid; place-items:center; width:38px; height:38px; border-radius:9px; border:none; background:rgba(255,255,255,0.08); color:#fff; cursor:pointer; }
        .pl-btn:hover { background:rgba(255,255,255,0.18); }
        .print-sheet { display:none; }
        @media print {
          @page { size: 1920px 1080px; margin: 0; }
          body { background:#fff; }
          .print-sheet { display:block; }
          .print-slide { width:1920px; height:1080px; page-break-after: always; position:relative; overflow:hidden; }
        }
      `}</style>
    </div>
  );
}
