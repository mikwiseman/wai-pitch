import { STAGE_W, STAGE_H, type Slide } from '@/types/deck';
import { BlockView, blockFrame } from './BlockView';

export function slideBackground(bg: Slide['background']): string {
  if (bg.type === 'gradient') return bg.gradient;
  if (bg.type === 'image' && bg.image) return `${bg.color}`;
  return bg.color;
}

/** Renders a slide's background + ordered blocks at native 1920×1080. */
export function SlideView({ slide }: { slide: Slide }) {
  const blocks = [...slide.blocks].sort((a, b) => a.z - b.z);
  const bg = slide.background;
  return (
    <div style={{ position: 'relative', width: STAGE_W, height: STAGE_H, background: slideBackground(bg), overflow: 'hidden' }}>
      {bg.type === 'image' && bg.image && (
        <img src={bg.image} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: bg.imageFit }} />
      )}
      {blocks.map((b) => (
        <div key={b.id} style={blockFrame(b)}>
          <BlockView block={b} />
        </div>
      ))}
    </div>
  );
}
