'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { STAGE_W, STAGE_H } from '@/types/deck';
import { fitScale } from '@/lib/scale';

/**
 * Renders children on a fixed 1920×1080 stage, transform-scaled to fill its
 * parent (contain). This is the single source of visual truth used by the
 * player, share view, editor canvas and thumbnails.
 */
export function Stage({ children, className, background }: { children: ReactNode; className?: string; background?: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setScale(fitScale(r.width, r.height));
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setScale(fitScale(r.width, r.height));
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={boxRef} className={className} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background }}>
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: STAGE_W, height: STAGE_H,
          transform: `translate(-50%, -50%) scale(${scale || 0.0001})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  );
}
