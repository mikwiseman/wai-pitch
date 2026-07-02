import type { CSSProperties } from 'react';
import type { Block } from '@/types/deck';

/** Absolute frame for a block within the 1920×1080 stage. */
export function blockFrame(b: Block): CSSProperties {
  return {
    position: 'absolute',
    left: b.x, top: b.y, width: b.w, height: b.h,
    transform: b.rotation ? `rotate(${b.rotation}deg)` : undefined,
    opacity: b.opacity,
    zIndex: b.z,
  };
}

/** Read-only visual for a single block (shared by player, thumbnail, editor). */
export function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case 'text':
      return (
        <div
          style={{
            width: '100%', height: '100%', display: 'flex',
            justifyContent: block.align === 'center' ? 'center' : block.align === 'right' ? 'flex-end' : 'flex-start',
            alignItems: block.valign === 'middle' ? 'center' : block.valign === 'bottom' ? 'flex-end' : 'flex-start',
            background: block.background, padding: `${block.paddingY}px ${block.paddingX}px`,
            overflow: 'hidden',
          }}
        >
          <div
            className="block-text"
            style={{
              width: '100%',
              fontFamily: block.fontFamily, fontSize: block.fontSize, color: block.color,
              textAlign: block.align, lineHeight: block.lineHeight, letterSpacing: block.letterSpacing,
              fontWeight: block.bold ? 700 : 400,
            }}
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        </div>
      );
    case 'image':
      return block.src
        ? <img src={block.src} alt={block.alt} style={{ width: '100%', height: '100%', objectFit: block.fit, borderRadius: block.radius, display: 'block' }} />
        : <div style={{ width: '100%', height: '100%', borderRadius: block.radius, background: '#e9e4d8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b877c', fontSize: 28 }}>Image</div>;
    case 'shape':
      return <ShapeView block={block} />;
    case 'table':
      return <TableView block={block} />;
    case 'embed':
      return block.url
        ? <iframe src={block.url} style={{ width: '100%', height: '100%', border: 0, borderRadius: block.radius }} allow="fullscreen" referrerPolicy="no-referrer" />
        : <div style={{ width: '100%', height: '100%', borderRadius: block.radius, background: '#e9e4d8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b877c', fontSize: 28 }}>Embed URL</div>;
    case 'chart':
      return <ChartView block={block} />;
  }
}

function ShapeView({ block }: { block: Extract<Block, { type: 'shape' }> }) {
  const common = { fill: block.fill, stroke: block.stroke, strokeWidth: block.strokeWidth };
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${block.w} ${block.h}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
      {block.shape === 'rect' && <rect x={block.strokeWidth / 2} y={block.strokeWidth / 2} width={Math.max(0, block.w - block.strokeWidth)} height={Math.max(0, block.h - block.strokeWidth)} rx={block.radius} {...common} />}
      {block.shape === 'ellipse' && <ellipse cx={block.w / 2} cy={block.h / 2} rx={Math.max(0, block.w / 2 - block.strokeWidth / 2)} ry={Math.max(0, block.h / 2 - block.strokeWidth / 2)} {...common} />}
      {block.shape === 'triangle' && <polygon points={`${block.w / 2},${block.strokeWidth} ${block.w - block.strokeWidth},${block.h - block.strokeWidth} ${block.strokeWidth},${block.h - block.strokeWidth}`} {...common} />}
      {block.shape === 'line' && <line x1={0} y1={block.h / 2} x2={block.w} y2={block.h / 2} stroke={block.stroke !== 'transparent' ? block.stroke : block.fill} strokeWidth={block.strokeWidth || 4} strokeLinecap="round" />}
    </svg>
  );
}

function TableView({ block }: { block: Extract<Block, { type: 'table' }> }) {
  const cells = block.cells;
  return (
    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', fontSize: block.fontSize, color: block.color, tableLayout: 'fixed' }}>
      <tbody>
        {Array.from({ length: block.rows }).map((_, r) => (
          <tr key={r}>
            {Array.from({ length: block.cols }).map((__, c) => {
              const isHeader = block.headerRow && r === 0;
              return (
                <td key={c} style={{
                  border: `1px solid ${block.borderColor}`, padding: '10px 14px',
                  background: isHeader ? block.headerBg : 'transparent',
                  color: isHeader ? block.headerColor : block.color,
                  fontWeight: isHeader ? 600 : 400, textAlign: 'left', verticalAlign: 'middle',
                }}>{cells[r]?.[c] ?? ''}</td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ChartView({ block }: { block: Extract<Block, { type: 'chart' }> }) {
  const max = Math.max(1, ...block.series);
  const pad = 40;
  const w = block.w, h = block.h;
  const plotH = h - pad * 2 - (block.title ? 40 : 0);
  const topOffset = block.title ? 40 : 0;
  if (block.chart === 'pie') {
    const total = block.series.reduce((a, v) => a + v, 0) || 1;
    let acc = 0;
    const cx = w / 2, cy = topOffset + (h - topOffset) / 2, rad = Math.min(w, h - topOffset) / 2 - 20;
    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        {block.title && <text x={w / 2} y={26} textAnchor="middle" fontSize={26} fill={block.color}>{block.title}</text>}
        {block.series.map((v, i) => {
          const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2; acc += v;
          const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2;
          const x0 = cx + rad * Math.cos(a0), y0 = cy + rad * Math.sin(a0);
          const x1 = cx + rad * Math.cos(a1), y1 = cy + rad * Math.sin(a1);
          const large = a1 - a0 > Math.PI ? 1 : 0;
          const op = 1 - i * (0.6 / Math.max(1, block.series.length));
          return <path key={i} d={`M${cx},${cy} L${x0},${y0} A${rad},${rad} 0 ${large} 1 ${x1},${y1} Z`} fill={block.color} opacity={op} />;
        })}
      </svg>
    );
  }
  const barW = (w - pad * 2) / (block.series.length * 1.6);
  const gap = barW * 0.6;
  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {block.title && <text x={w / 2} y={26} textAnchor="middle" fontSize={26} fill={block.color}>{block.title}</text>}
      <line x1={pad} y1={topOffset + plotH + pad} x2={w - pad} y2={topOffset + plotH + pad} stroke="#d8d3c7" />
      {block.chart === 'bar' && block.series.map((v, i) => {
        const bh = (v / max) * plotH;
        const x = pad + i * (barW + gap);
        return <g key={i}>
          <rect x={x} y={topOffset + pad + (plotH - bh)} width={barW} height={bh} rx={6} fill={block.color} />
          <text x={x + barW / 2} y={topOffset + plotH + pad + 26} textAnchor="middle" fontSize={20} fill="#5f5c54">{block.labels[i] ?? ''}</text>
        </g>;
      })}
      {block.chart === 'line' && (() => {
        const pts = block.series.map((v, i) => {
          const x = pad + (i / Math.max(1, block.series.length - 1)) * (w - pad * 2);
          const y = topOffset + pad + (plotH - (v / max) * plotH);
          return `${x},${y}`;
        });
        return <>
          <polyline points={pts.join(' ')} fill="none" stroke={block.color} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
          {pts.map((p, i) => { const [x, y] = p.split(',').map(Number); return <circle key={i} cx={x} cy={y} r={6} fill={block.color} />; })}
        </>;
      })()}
    </svg>
  );
}
