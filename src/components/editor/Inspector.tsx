'use client';
import { useRef } from 'react';
import { useEditor } from '@/lib/editor-store';
import { Icon } from '@/components/icons';
import type { Block } from '@/types/deck';

export function Inspector() {
  const deck = useEditor((s) => s.deck);
  const current = useEditor((s) => s.current);
  const selection = useEditor((s) => s.selection);
  const slide = deck.slides[current];
  const sel = slide?.blocks.find((b) => selection.includes(b.id));
  return (
    <div style={{ height: '100%', overflow: 'auto', borderLeft: '1px solid var(--color-line)', background: 'var(--color-paper)', padding: 14 }}>
      {sel ? <BlockInspector block={sel} /> : <SlideInspector />}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '78px 1fr', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: 'var(--color-ink-2)' }}>
      <span>{label}</span>
      <div>{children}</div>
    </label>
  );
}
function Num({ value, onChange, step = 1 }: { value: number; onChange: (n: number) => void; step?: number }) {
  return <input className="input" type="number" step={step} value={Math.round(value * 100) / 100} onChange={(e) => onChange(Number(e.target.value))} style={{ height: 32 }} />;
}
function Color({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const norm = value === 'transparent' ? '#ffffff' : value;
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input type="color" value={/^#[0-9a-f]{6}$/i.test(norm) ? norm : '#000000'} onChange={(e) => onChange(e.target.value)} style={{ width: 32, height: 32, padding: 0, border: '1px solid var(--color-line-2)', borderRadius: 8, background: 'none' }} />
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ height: 32 }} />
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-ink-3)', margin: '14px 0 8px' }}>{children}</div>;
}

function SlideInspector() {
  const slide = useEditor((s) => s.deck.slides[s.current]);
  const setBackground = useEditor((s) => s.setBackground);
  const setNotes = useEditor((s) => s.setNotes);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!slide) return null;
  const bg = slide.background;
  return (
    <div>
      <h3 className="t-title" style={{ fontSize: 16, margin: '2px 0 4px' }}>Slide</h3>
      <SectionTitle>Background</SectionTitle>
      <Row label="Type">
        <select className="input" value={bg.type} onChange={(e) => setBackground({ type: e.target.value as typeof bg.type })} style={{ height: 32 }}>
          <option value="color">Color</option><option value="gradient">Gradient</option><option value="image">Image</option>
        </select>
      </Row>
      {bg.type === 'color' && <Row label="Color"><Color value={bg.color} onChange={(v) => setBackground({ color: v })} /></Row>}
      {bg.type === 'gradient' && <Row label="CSS"><input className="input" value={bg.gradient} onChange={(e) => setBackground({ gradient: e.target.value })} style={{ height: 32 }} /></Row>}
      {bg.type === 'image' && (
        <>
          <Row label="Image">
            <button className="btn" style={{ height: 32 }} onClick={() => fileRef.current?.click()}>Upload…</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/uploads', { method: 'POST', body: fd }).then((x) => x.json()); setBackground({ image: r.url }); }} />
          </Row>
          <Row label="Fit"><select className="input" value={bg.imageFit} onChange={(e) => setBackground({ imageFit: e.target.value as 'cover' | 'contain' })} style={{ height: 32 }}><option value="cover">Cover</option><option value="contain">Contain</option></select></Row>
        </>
      )}
      <SectionTitle>Speaker notes</SectionTitle>
      <textarea className="input" value={slide.notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for this slide…" style={{ height: 140, padding: 10, resize: 'vertical' }} />
      <div style={{ marginTop: 12, fontSize: 12, color: 'var(--color-ink-3)' }}>Tip: double-click a text box to edit. Select a block to style it.</div>
    </div>
  );
}

function BlockInspector({ block }: { block: Block }) {
  const update = useEditor((s) => s.updateSelected);
  const del = useEditor((s) => s.deleteSelected);
  const dup = useEditor((s) => s.duplicateSelected);
  const z = useEditor((s) => s.reorderZ);
  const fileRef = useRef<HTMLInputElement>(null);
  const u = (patch: Partial<Block>) => update(patch);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 className="t-title" style={{ fontSize: 16, margin: '2px 0', textTransform: 'capitalize' }}>{block.type}</h3>
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="btn btn-icon btn-ghost" title="Duplicate" onClick={dup} style={{ height: 30, width: 30 }}><Icon.Duplicate width={15} /></button>
          <button className="btn btn-icon btn-ghost" title={block.locked ? 'Unlock' : 'Lock'} onClick={() => u({ locked: !block.locked })} style={{ height: 30, width: 30 }}><Icon.Lock width={15} /></button>
          <button className="btn btn-icon btn-ghost" title="Delete" onClick={del} style={{ height: 30, width: 30, color: '#b23c2b' }}><Icon.Trash width={15} /></button>
        </div>
      </div>

      {block.type === 'text' && (
        <>
          <SectionTitle>Text</SectionTitle>
          <Row label="Size"><Num value={block.fontSize} onChange={(n) => u({ fontSize: n })} /></Row>
          <Row label="Color"><Color value={block.color} onChange={(v) => u({ color: v })} /></Row>
          <Row label="Line h"><Num step={0.1} value={block.lineHeight} onChange={(n) => u({ lineHeight: n })} /></Row>
          <Row label="Font">
            <select className="input" value={block.fontFamily} onChange={(e) => u({ fontFamily: e.target.value })} style={{ height: 32 }}>
              <option value="var(--font-sans)">Sans (Inter)</option>
              <option value="var(--font-serif)">Serif (Fraunces)</option>
            </select>
          </Row>
          <Row label="Align">
            <div style={{ display: 'flex', gap: 4 }}>
              {(['left', 'center', 'right', 'justify'] as const).map((a) => (
                <button key={a} className="btn" onClick={() => u({ align: a })} style={{ height: 32, flex: 1, padding: 0, background: block.align === a ? 'var(--color-paper-3)' : undefined, fontSize: 11 }}>{a[0].toUpperCase()}</button>
              ))}
            </div>
          </Row>
          <Row label="Weight"><button className="btn" onClick={() => u({ bold: !block.bold })} style={{ height: 32, fontWeight: 700, background: block.bold ? 'var(--color-paper-3)' : undefined }}>Bold</button></Row>
          <Row label="V-align"><select className="input" value={block.valign} onChange={(e) => u({ valign: e.target.value as 'top' | 'middle' | 'bottom' })} style={{ height: 32 }}><option value="top">Top</option><option value="middle">Middle</option><option value="bottom">Bottom</option></select></Row>
          <Row label="Fill"><Color value={block.background} onChange={(v) => u({ background: v })} /></Row>
        </>
      )}

      {block.type === 'image' && (
        <>
          <SectionTitle>Image</SectionTitle>
          <Row label="Source"><button className="btn" style={{ height: 32 }} onClick={() => fileRef.current?.click()}>Replace…</button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append('file', f); const r = await fetch('/api/uploads', { method: 'POST', body: fd }).then((x) => x.json()); u({ src: r.url }); }} />
          </Row>
          <Row label="URL"><input className="input" value={block.src} onChange={(e) => u({ src: e.target.value })} style={{ height: 32 }} /></Row>
          <Row label="Fit"><select className="input" value={block.fit} onChange={(e) => u({ fit: e.target.value as 'cover' | 'contain' | 'fill' })} style={{ height: 32 }}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></Row>
          <Row label="Radius"><Num value={block.radius} onChange={(n) => u({ radius: n })} /></Row>
        </>
      )}

      {block.type === 'shape' && (
        <>
          <SectionTitle>Shape</SectionTitle>
          <Row label="Shape"><select className="input" value={block.shape} onChange={(e) => u({ shape: e.target.value as 'rect' | 'ellipse' | 'line' | 'triangle' })} style={{ height: 32 }}><option value="rect">Rectangle</option><option value="ellipse">Ellipse</option><option value="triangle">Triangle</option><option value="line">Line</option></select></Row>
          <Row label="Fill"><Color value={block.fill} onChange={(v) => u({ fill: v })} /></Row>
          <Row label="Stroke"><Color value={block.stroke} onChange={(v) => u({ stroke: v })} /></Row>
          <Row label="Stroke w"><Num value={block.strokeWidth} onChange={(n) => u({ strokeWidth: n })} /></Row>
          <Row label="Radius"><Num value={block.radius} onChange={(n) => u({ radius: n })} /></Row>
        </>
      )}

      {block.type === 'table' && (
        <>
          <SectionTitle>Table</SectionTitle>
          <Row label="Rows"><Num value={block.rows} onChange={(n) => u({ rows: Math.max(1, n) })} /></Row>
          <Row label="Cols"><Num value={block.cols} onChange={(n) => u({ cols: Math.max(1, n) })} /></Row>
          <Row label="Font"><Num value={block.fontSize} onChange={(n) => u({ fontSize: n })} /></Row>
          <Row label="Header bg"><Color value={block.headerBg} onChange={(v) => u({ headerBg: v })} /></Row>
          <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginTop: 6 }}>Double-click cells on canvas to edit.</div>
        </>
      )}

      {block.type === 'embed' && (
        <>
          <SectionTitle>Embed</SectionTitle>
          <Row label="URL"><input className="input" value={block.url} onChange={(e) => u({ url: e.target.value })} placeholder="https://…" style={{ height: 32 }} /></Row>
          <Row label="Radius"><Num value={block.radius} onChange={(n) => u({ radius: n })} /></Row>
        </>
      )}

      {block.type === 'chart' && (
        <>
          <SectionTitle>Chart</SectionTitle>
          <Row label="Type"><select className="input" value={block.chart} onChange={(e) => u({ chart: e.target.value as 'bar' | 'line' | 'pie' })} style={{ height: 32 }}><option value="bar">Bar</option><option value="line">Line</option><option value="pie">Pie</option></select></Row>
          <Row label="Color"><Color value={block.color} onChange={(v) => u({ color: v })} /></Row>
          <Row label="Title"><input className="input" value={block.title} onChange={(e) => u({ title: e.target.value })} style={{ height: 32 }} /></Row>
          <Row label="Labels"><input className="input" value={block.labels.join(',')} onChange={(e) => u({ labels: e.target.value.split(',').map((x) => x.trim()) })} style={{ height: 32 }} /></Row>
          <Row label="Values"><input className="input" value={block.series.join(',')} onChange={(e) => u({ series: e.target.value.split(',').map((x) => Number(x.trim()) || 0) })} style={{ height: 32 }} /></Row>
        </>
      )}

      <SectionTitle>Arrange</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
        <button className="btn" style={{ height: 32 }} onClick={() => z(block.id, 'front')}>To front</button>
        <button className="btn" style={{ height: 32 }} onClick={() => z(block.id, 'back')}>To back</button>
        <button className="btn" style={{ height: 32 }} onClick={() => z(block.id, 'forward')}>Forward</button>
        <button className="btn" style={{ height: 32 }} onClick={() => z(block.id, 'backward')}>Backward</button>
      </div>
      <SectionTitle>Position</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Row label="X"><Num value={block.x} onChange={(n) => u({ x: n })} /></Row>
        <Row label="Y"><Num value={block.y} onChange={(n) => u({ y: n })} /></Row>
        <Row label="W"><Num value={block.w} onChange={(n) => u({ w: n })} /></Row>
        <Row label="H"><Num value={block.h} onChange={(n) => u({ h: n })} /></Row>
        <Row label="Rotate"><Num value={block.rotation} onChange={(n) => u({ rotation: n })} /></Row>
        <Row label="Opacity"><Num step={0.05} value={block.opacity} onChange={(n) => u({ opacity: Math.max(0, Math.min(1, n)) })} /></Row>
      </div>
    </div>
  );
}
