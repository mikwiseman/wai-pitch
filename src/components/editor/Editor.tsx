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
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
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
    setActionError('');
    try {
      const on = !shareUrl;
      const response = await fetch(`/api/presentations/${id}/actions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'share', on }) });
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      const result = await response.json();
      if (result.token) {
        const url = `${location.origin}/v/${result.token}`;
        setShareUrl(url);
        await navigator.clipboard?.writeText(url);
      } else setShareUrl(null);
    } catch (cause) {
      setActionError(`Share failed: ${String(cause)}`);
    }
  }

  async function onAddImage(file: File) {
    setActionError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const response = await fetch('/api/uploads', { method: 'POST', body: fd });
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      const result = await response.json();
      addBlock('image', { src: result.url } as Partial<import('@/types/deck').Block>);
    } catch (cause) {
      setActionError(`Upload failed: ${String(cause)}`);
    }
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
    <div className="editor-shell">
      <header className="editor-topbar glass-panel">
        <div className="editor-file">
          <button className="editor-home" title="Back to workspace" aria-label="Back to workspace" onClick={() => router.push('/')}><span className="t-title">W</span></button>
          <div className="editor-title-wrap">
            <input aria-label="Project title" value={title} onChange={(event) => setTitle(event.target.value)} />
            <span className="save-state">{saving === 'saving' ? 'Saving changes…' : saving === 'saved' ? 'All changes saved' : saving === 'error' ? 'Save failed' : 'WAI Design canvas'}</span>
          </div>
        </div>

        <div className="editor-mode-switch" aria-label="Canvas mode">
          <span><Icon.Edit width={14} /> Design</span>
          <a href={`/present/${id}`} target="_blank" rel="noreferrer"><Icon.Play width={12} /> Preview</a>
        </div>

        <div className="editor-actions">
          <button className="btn btn-icon btn-ghost editor-secondary-action" title="Undo" aria-label="Undo" onClick={() => useEditor.temporal.getState().undo()}><Icon.Undo width={17} /></button>
          <button className="btn btn-icon btn-ghost editor-secondary-action" title="Redo" aria-label="Redo" onClick={() => useEditor.temporal.getState().redo()}><Icon.Redo width={17} /></button>
          <button className="btn btn-icon btn-ghost editor-notes-action" title="Speaker notes" aria-label="Speaker notes" onClick={() => setNotesOpen((value) => !value)} style={{ background: notesOpen ? 'rgba(255,255,255,0.8)' : undefined }}><Icon.Notes width={17} /></button>
          <button className="btn btn-icon btn-ghost" title="Properties" aria-label="Toggle properties" onClick={() => setInspectorOpen((value) => !value)}><Icon.Layers width={17} /></button>
          <a className="btn btn-icon editor-secondary-action" href={`/present/${id}`} target="_blank" rel="noreferrer" title="Export PDF" aria-label="Export PDF"><Icon.Download width={16} /></a>
          <button className="btn editor-secondary-action" onClick={() => void toggleShare()}><Icon.Share width={15} /> {shareUrl ? 'Link copied' : 'Share'}</button>
          <button className="btn btn-primary" onClick={() => router.push(`/present/${id}`)}><Icon.Play width={14} /> Present</button>
        </div>
      </header>

      {shareUrl && <div className="editor-share-toast">Public link copied: <a href={shareUrl}>{shareUrl}</a></div>}
      {actionError && <div className="editor-share-toast" role="alert">{actionError}</div>}

      <div className="editor-workspace">
        <aside className="editor-side-panel editor-side-panel--slides glass-panel"><SlidePanel /></aside>
        <main className="editor-canvas-column">
          <div className="editor-canvas"><Canvas zoom={zoom} /></div>
          {notesOpen && <NotesBar />}
          <div className="insert-dock glass-panel" aria-label="Insert tools">
            {tools.map((tool) => (
              <button key={tool.type} className="insert-tool" title={`Add ${tool.label}`} onClick={() => { if (tool.type === 'image') addImageFileRef.current?.click(); else addBlock(tool.type); }}>
                {tool.icon}<span>{tool.label}</span>
              </button>
            ))}
            <input ref={addImageFileRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void onAddImage(file); event.currentTarget.value = ''; }} />
            <span className="dock-separator" />
            <div className="zoom-control">
              <button aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.25, value - 0.1))}>−</button>
              <span>{Math.round(zoom * 100)}%</span>
              <button aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(2, value + 0.1))}>+</button>
            </div>
          </div>
        </main>
        <aside className={`editor-side-panel editor-side-panel--inspector glass-panel${inspectorOpen ? ' is-open' : ''}`}><Inspector /></aside>
      </div>
    </div>
  );
}

function NotesBar() {
  const slide = useEditor((s) => s.deck.slides[s.current]);
  const setNotes = useEditor((s) => s.setNotes);
  const current = useEditor((s) => s.current);
  return (
    <div className="notes-bar">
      <div className="notes-label">Speaker notes · Frame {current + 1}</div>
      <textarea className="input" value={slide?.notes ?? ''} onChange={(event) => setNotes(event.target.value)} placeholder="Add a cue for this frame…" />
    </div>
  );
}
