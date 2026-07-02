'use client';
import { Stage } from './stage/Stage';
import { SlideView, slideBackground } from './stage/SlideView';
import type { Slide } from '@/types/deck';

/** A live 16:9 slide preview (WYSIWYG, same renderer as the player). */
export function Thumb({ slide, className }: { slide: Slide | null; className?: string }) {
  if (!slide) {
    return <div className={className} style={{ width: '100%', aspectRatio: '16 / 9', background: '#f0ece1' }} />;
  }
  return (
    <div className={className} style={{ width: '100%', aspectRatio: '16 / 9', background: slideBackground(slide.background), overflow: 'hidden' }}>
      <Stage>
        <SlideView slide={slide} />
      </Stage>
    </div>
  );
}
