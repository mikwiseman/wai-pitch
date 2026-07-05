'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEditor } from '@/lib/editor-store';
import { Deck, type Deck as DeckT, type BlockType } from '@/types/deck';
import { Canvas } from './Canvas';
import { SlidePanel } from './SlidePanel';
import { Inspector } from './Inspector';
import { Icon } from '@/components/icons';

export function Editor({ id, initialTitle, initialDeck }: { id: string; initialTitle: string; initialDeck: DeckT }) {
  const router = useRouter();
  const load = useEditor((s) => s.load);
  const deck = useEditor((s) => s.deck);
  const title = useEditor((s) => s.title);
  const setTitle = useEditor((s) => s.setTitle);
  const saving = useEditor((s) => s.saving);
  const setSaving = useEditor((s) => s.setSaving);
  const current = useEditor((s) => s.current);
  const addBlock = useEditor((s) => s.addBlock);
  const addImageFileRef = useRef<HTMLInputElement>(null);
  const [zoom, setZoom] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const booted = useRef(false);
  const readyToSave = useRef(false);

  // Load once into the store.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    load(id, initialTitle, Deck.parse(initialDeck));
    useEditor.temporal.getState().clear();
    // Arm autosave only after the loaded deck has settled, so opening a deck
    // never triggers a spurious write.
    const t = setTimeout(() => { readyToSave.current = true; }, 50);
    return () => clearTimeout(t);
  }, [id, initialTitle, initialDeck, load]);

  // After undo/redo (or delete) shrinks the deck, keep `current` in range so the
  // canvas/inspector never point past the end.
  useEffect(() => {
    const st = useEditor.getState();
    if (st.current > deck.slides.length - 1) st.goto(deck.slides.length - 1);
  }, [deck.slides.length]);

  // Debounced autosave when deck or title change. A monotonic id guards against
  // out-of-order responses overwriting the status of a newer save.
  const saveSeq = useRef(0);
  useEffect(() => {
    if (!readyToSave.current) return;
    setSaving('saving');
    const seq = ++saveSeq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/presentations/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ deck, title }) });
        if (seq === saveSeq.current) setSaving(res.ok ? 'saved' : 'error');
      } catch { if (seq === saveSeq.current) setSaving('error'); }
    }, 700);
    return () => clearTimeout(t);
  }, [deck, title, id, setSaving]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || editable;
      const mod = e.metaKey || e.ctrlKey;
      const st = useEditor.getState();
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) { if (!typing) { e.preventDefault(); useEditor.temporal.getState().undo(); } return; }
      if (mod && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { if (!typing) { e.preventDefault(); useEditor.temporal.getState().redo(); } return; }
      if (typing) return;
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); st.duplicateSelected(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (st.selection.length) { e.preventDefault(); st.deleteSelected(); } return; }
      if (e.key === 'ArrowLeft' && !st.selection.length) { st.goto(st.current - 1); return; }
      if (e.key === 'ArrowRight' && !st.selection.length) { st.goto(st.current + 1); return; }
      const step = e.shiftKey ? 10 : 1;
      if (st.selection.length) {
        if (e.key === 'ArrowUp') { e.preventDefault(); st.nudge(0, -step); }
        if (e.key === 'ArrowDown') { e.preventDefault(); st.nudge(0, step); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); st.nudge(-step, 0); }
        if (e.key === 'ArrowRight') { e.preventDefault(); st.nudge(step, 0); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function toggleShare() {
    const on = !shareUrl;
    const r = await fetch(`/api/presentations/${id}/actions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'share', on }) }).then((x) => x.json());
    if (r.token) { const url = `${location.origin}/v/${r.token}`; setShareUrl(url); navigator.clipboard?.writeText(url).catch(() => {}); }
    else setShareUrl(null);
  }

  async function onAddImage(file: File) {
    const fd = new FormData(); fd.append('file', file);
    const r = await fetch('/api/uploads', { method: 'POST', body: fd }).then((x) => x.json());
    addBlock('image', { src: r.url } as Partial<import('@/types/deck').Block>);
  }

  const tools: { type: BlockType; label: string; icon: React.ReactNode }[] = [
    { type: 'text', label: 'Text', icon: <Icon.Type width={18} /> },
    { type: 'image', label: 'Media', icon: <Icon.Image width={18} /> },
    { type: 'shape', label: 'Shape', icon: <Icon.Shape width={18} /> },
    { type: 'table', label: 'Table', icon: <Icon.Table width={18} /> },
    { type: 'chart', label: 'Chart', icon: <Icon.Chart width={18} /> },
    { type: 'embed', label: 'Embed', icon: <Icon.Embed width={18} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--color-paper)' }}>
      {/* Top bar */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', height: 56, borderBottom: '1px solid var(--color-line)', flex: 'none' }}>
        <button className="btn btn-icon btn-ghost" title="Back" onClick={() => router.push('/')}><Icon.Home width={18} /></button>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ border: 'none', background: 'transparent', fontSize: 15, fontWeight: 600, width: 320, outline: 'none' }} />
        <span style={{ fontSize: 12, color: 'var(--color-ink-3)' }}>{saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved' : saving === 'error' ? 'Save failed' : ''}</span>

        {/* Insert toolbar */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 16 }}>
          {tools.map((t) => (
            <button key={t.type} className="btn btn-ghost" style={{ flexDirection: 'column', height: 46, width: 58, gap: 2, fontSize: 11 }}
              onClick={() => { if (t.type === 'image') addImageFileRef.current?.click(); else addBlock(t.type); }}>
              {t.icon}<span>{t.label}</span>
            </button>
          ))}
          <input ref={addImageFileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onAddImage(f); e.currentTarget.value = ''; }} />
        </div>

        <div style={{ flex: 1 }} />
        <button className="btn btn-icon btn-ghost" title="Undo" onClick={() => useEditor.temporal.getState().undo()}><Icon.Undo width={18} /></button>
        <button className="btn btn-icon btn-ghost" title="Redo" onClick={() => useEditor.temporal.getState().redo()}><Icon.Redo width={18} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, border: '1px solid var(--color-line-2)', borderRadius: 8, height: 34, padding: '0 4px' }}>
          <button className="btn btn-icon btn-ghost" style={{ height: 28, width: 28 }} onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))}>−</button>
          <span style={{ fontSize: 12, width: 40, textAlign: 'center', color: 'var(--color-ink-2)' }}>{Math.round(zoom * 100)}%</span>
          <button className="btn btn-icon btn-ghost" style={{ height: 28, width: 28 }} onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>+</button>
        </div>
        <button className="btn btn-ghost btn-icon" title="Speaker notes" onClick={() => setNotesOpen((v) => !v)} style={{ background: notesOpen ? 'var(--color-paper-3)' : undefined }}><Icon.Notes width={18} /></button>
        <button className="btn" onClick={toggleShare}><Icon.Share width={16} /> {shareUrl ? 'Copied' : 'Share'}</button>
        <a className="btn" href={`/present/${id}`} target="_blank" rel="noreferrer"><Icon.Download width={16} /> PDF</a>
        <button className="btn btn-primary" onClick={() => router.push(`/present/${id}`)}><Icon.Play width={16} /> Present</button>
      </header>

      {shareUrl && <div style={{ padding: '8px 16px', background: 'var(--color-clay-wash)', fontSize: 13, color: 'var(--color-clay-ink)', borderBottom: '1px solid var(--color-line)' }}>Public link copied: <a href={shareUrl} style={{ color: 'inherit' }}>{shareUrl}</a></div>}

      {/* Body */}
      <div style={{ display: 'grid', gridTemplateColumns: '210px 1fr 272px', flex: 1, minHeight: 0 }}>
        <SlidePanel />
        <div style={{ position: 'relative', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0 }}><Canvas zoom={zoom} /></div>
          {notesOpen && <NotesBar />}
        </div>
        <Inspector />
      </div>
    </div>
  );
}

function NotesBar() {
  const slide = useEditor((s) => s.deck.slides[s.current]);
  const setNotes = useEditor((s) => s.setNotes);
  const current = useEditor((s) => s.current);
  return (
    <div style={{ borderTop: '1px solid var(--color-line)', background: 'var(--color-paper)', padding: 10, height: 150, flex: 'none' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-ink-3)', marginBottom: 6 }}>Speaker notes · Slide {current + 1}</div>
      <textarea className="input" value={slide?.notes ?? ''} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for this slide…" style={{ height: 100, padding: 10, resize: 'none' }} />
    </div>
  );
}
