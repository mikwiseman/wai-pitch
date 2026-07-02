'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type PresListItem, type Folder } from '@/lib/client-api';
import { Thumb } from '@/components/Thumb';
import { Icon } from '@/components/icons';

type View = { kind: 'all' } | { kind: 'trash' } | { kind: 'folder'; id: string };
type Sort = 'updated' | 'created' | 'title';

export function Dashboard() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<PresListItem[]>([]);
  const [view, setView] = useState<View>({ kind: 'all' });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [aiOpen, setAiOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const reloadFolders = useCallback(() => api.listFolders().then(setFolders).catch(() => {}), []);
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      if (view.kind === 'trash') setItems(await api.listPresentations({ trashed: true }));
      else if (view.kind === 'folder') setItems(await api.listPresentations({ folderId: view.id }));
      else setItems(await api.listPresentations());
    } finally { setLoading(false); }
  }, [view]);

  useEffect(() => { reloadFolders(); }, [reloadFolders]);
  useEffect(() => { reload(); }, [reload]);

  const visible = useMemo(() => {
    let list = items;
    if (q.trim()) list = list.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));
    const by: Record<Sort, (a: PresListItem, b: PresListItem) => number> = {
      updated: (a, b) => b.updatedAt - a.updatedAt,
      created: (a, b) => b.createdAt - a.createdAt,
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...list].sort(by[sort]);
  }, [items, q, sort]);

  const rootFolders = folders.filter((f) => !f.parentId).sort((a, b) => a.position - b.position);
  const childrenOf = (id: string) => folders.filter((f) => f.parentId === id).sort((a, b) => a.position - b.position);

  async function createBlank() {
    setBusy(true);
    try {
      const folderId = view.kind === 'folder' ? view.id : null;
      const { id } = await api.createPresentation({ folderId });
      router.push(`/edit/${id}`);
    } finally { setBusy(false); }
  }
  async function createFolder() {
    const name = prompt('Folder name')?.trim();
    if (!name) return;
    const parentId = view.kind === 'folder' ? view.id : null;
    await api.createFolder(name, parentId);
    reloadFolders();
  }

  const title = view.kind === 'trash' ? 'Recently deleted' : view.kind === 'folder' ? (folders.find((f) => f.id === view.id)?.name ?? 'Folder') : 'All presentations';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '272px 1fr', height: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ borderRight: '1px solid var(--color-line)', background: 'var(--color-paper)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '18px 18px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: 'var(--color-ink)', color: 'var(--color-paper)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 15 }}>W</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>WaiWai</div>
        </div>
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ position: 'relative' }}>
            <Icon.Search style={{ position: 'absolute', left: 10, top: 10, color: 'var(--color-ink-3)' }} width={16} height={16} />
            <input className="input" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} style={{ paddingLeft: 34, height: 36 }} />
          </div>
        </div>
        <nav style={{ padding: '4px 8px', overflow: 'auto', flex: 1 }}>
          <NavItem active={view.kind === 'all'} onClick={() => setView({ kind: 'all' })} icon={<Icon.Home width={18} />} label="All presentations" />
          <NavItem active={view.kind === 'trash'} onClick={() => setView({ kind: 'trash' })} icon={<Icon.Trash width={18} />} label="Recently deleted" />
          <div style={{ margin: '14px 10px 6px', fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-ink-3)' }}>Teamspace</div>
          {rootFolders.map((f) => (
            <FolderNode key={f.id} folder={f} childrenOf={childrenOf} view={view} setView={setView} onChange={reloadFolders} depth={0} />
          ))}
          <button className="btn btn-ghost" onClick={createFolder} style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-ink-2)', marginTop: 4 }}>
            <Icon.Plus width={16} /> New folder
          </button>
        </nav>
      </aside>

      {/* Main */}
      <main style={{ overflow: 'auto', background: 'var(--color-paper)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '28px 40px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <h1 className="t-title" style={{ fontSize: 30, margin: 0 }}>{title}</h1>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className="input" style={{ width: 'auto', height: 36 }} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                <option value="updated">Last updated</option>
                <option value="created">Date created</option>
                <option value="title">Title</option>
              </select>
            </div>
          </div>

          {view.kind !== 'trash' && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 30, flexWrap: 'wrap' }}>
              <CreateTile onClick={() => setAiOpen(true)} icon={<Icon.Sparkle width={20} />} label="Create with AI" accent />
              <CreateTile onClick={createBlank} icon={<Icon.Plus width={20} />} label="Create presentation" />
              <CreateTile onClick={createFolder} icon={<Icon.Folder width={20} />} label="Create folder" />
            </div>
          )}

          {loading ? (
            <div style={{ color: 'var(--color-ink-3)', padding: 40 }}>Loading…</div>
          ) : visible.length === 0 ? (
            <div style={{ color: 'var(--color-ink-3)', padding: '60px 0', textAlign: 'center' }}>
              {view.kind === 'trash' ? 'Trash is empty.' : q ? 'No matches.' : 'No presentations yet — create one above.'}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 22 }}>
              {visible.map((p) => (
                <Card key={p.id} p={p} trash={view.kind === 'trash'} folders={folders} onChange={() => { reload(); }} />
              ))}
            </div>
          )}
        </div>
      </main>

      {aiOpen && <AiModal onClose={() => setAiOpen(false)} onDone={(id) => router.push(`/edit/${id}`)} />}
      {busy && <div style={{ position: 'fixed', inset: 0, background: 'rgba(250,249,245,0.5)', display: 'grid', placeItems: 'center', zIndex: 50 }}>Creating…</div>}
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
      padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14,
      background: active ? 'var(--color-paper-3)' : 'transparent', color: active ? 'var(--color-ink)' : 'var(--color-ink-2)', fontWeight: active ? 600 : 500,
    }}>{icon}{label}</button>
  );
}

function FolderNode({ folder, childrenOf, view, setView, onChange, depth }: { folder: Folder; childrenOf: (id: string) => Folder[]; view: View; setView: (v: View) => void; onChange: () => void; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const kids = childrenOf(folder.id);
  const active = view.kind === 'folder' && view.id === folder.id;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingLeft: depth * 14 }}>
        <button onClick={() => setOpen((o) => !o)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-ink-3)', padding: 4, visibility: kids.length ? 'visible' : 'hidden' }}>
          {open ? <Icon.ChevronDown width={14} /> : <Icon.Chevron width={14} />}
        </button>
        <button onClick={() => setView({ kind: 'folder', id: folder.id })} onDoubleClick={async () => { const n = prompt('Rename folder', folder.name)?.trim(); if (n) { await api.renameFolder(folder.id, n); onChange(); } }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, textAlign: 'left', padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, background: active ? 'var(--color-paper-3)' : 'transparent', color: active ? 'var(--color-ink)' : 'var(--color-ink-2)', fontWeight: active ? 600 : 500 }}>
          <Icon.Folder width={16} style={{ color: 'var(--color-ink-3)' }} /> <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
        </button>
      </div>
      {open && kids.map((k) => <FolderNode key={k.id} folder={k} childrenOf={childrenOf} view={view} setView={setView} onChange={onChange} depth={depth + 1} />)}
    </div>
  );
}

function CreateTile({ onClick, icon, label, accent }: { onClick: () => void; icon: React.ReactNode; label: string; accent?: boolean }) {
  return (
    <button className="card" onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer', minWidth: 210, background: 'var(--color-white)' }}>
      <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: accent ? 'var(--color-clay-wash)' : 'var(--color-paper-2)', color: accent ? 'var(--color-clay-ink)' : 'var(--color-ink)' }}>{icon}</span>
      <span style={{ fontWeight: 600, fontSize: 15 }}>{label}</span>
    </button>
  );
}

function Card({ p, trash, folders, onChange }: { p: PresListItem; trash: boolean; folders: Folder[]; onChange: () => void }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(p.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [menu]);

  const open = () => !trash && router.push(`/edit/${p.id}`);
  async function act(a: 'duplicate' | 'restore' | 'destroy' | 'share') {
    if (a === 'destroy' && !confirm('Delete forever?')) return;
    const r = await api.presAction(p.id, a);
    if (a === 'duplicate' && r.id) router.push(`/edit/${r.id}`);
    else onChange();
    setMenu(false);
  }
  async function rename() {
    setRenaming(false);
    if (name.trim() && name !== p.title) { await api.renamePresentation(p.id, name.trim()); onChange(); }
  }
  async function move(folderId: string | null) { await api.movePresentation(p.id, folderId); onChange(); setMenu(false); }

  return (
    <div className="card animate-fade-in" style={{ overflow: 'hidden', position: 'relative' }}>
      <div style={{ cursor: trash ? 'default' : 'pointer', position: 'relative' }} onClick={open}>
        <Thumb slide={p.thumb} />
        {!trash && (
          <button className="btn btn-icon" onClick={(e) => { e.stopPropagation(); router.push(`/present/${p.id}`); }}
            title="Present" style={{ position: 'absolute', right: 10, bottom: 10, height: 34, width: 34, opacity: 0.95 }}>
            <Icon.Play width={16} />
          </button>
        )}
        {p.published ? <span style={{ position: 'absolute', left: 10, top: 10, background: 'var(--color-white)', border: '1px solid var(--color-line)', borderRadius: 999, padding: '2px 8px', fontSize: 11, color: 'var(--color-ink-2)', display: 'flex', gap: 4, alignItems: 'center' }}><Icon.Share width={12} /> Shared</span> : null}
      </div>
      <div style={{ padding: '12px 14px', borderTop: '1px solid var(--color-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          {renaming ? (
            <input autoFocus className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={rename} onKeyDown={(e) => { if (e.key === 'Enter') rename(); if (e.key === 'Escape') { setRenaming(false); setName(p.title); } }} style={{ height: 30, fontSize: 14 }} />
          ) : (
            <div style={{ fontWeight: 600, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.title}>{p.title}</div>
          )}
          <div style={{ fontSize: 12, color: 'var(--color-ink-3)', marginTop: 2 }}>{p.slideCount} slide{p.slideCount === 1 ? '' : 's'} · {timeAgo(p.updatedAt)}</div>
        </div>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button className="btn btn-icon btn-ghost" onClick={() => setMenu((m) => !m)} style={{ height: 32, width: 32 }}><Icon.Dots width={18} /></button>
          {menu && (
            <div className="card" style={{ position: 'absolute', right: 0, top: 36, zIndex: 30, width: 190, padding: 6, boxShadow: 'var(--shadow-pop)' }}>
              {trash ? (
                <>
                  <MenuItem onClick={() => act('restore')} icon={<Icon.Undo width={16} />} label="Restore" />
                  <MenuItem onClick={() => act('destroy')} icon={<Icon.Trash width={16} />} label="Delete forever" danger />
                </>
              ) : (
                <>
                  <MenuItem onClick={() => { setMenu(false); open(); }} icon={<Icon.Edit width={16} />} label="Edit" />
                  <MenuItem onClick={() => { setMenu(false); setRenaming(true); }} icon={<Icon.Type width={16} />} label="Rename" />
                  <MenuItem onClick={() => act('duplicate')} icon={<Icon.Duplicate width={16} />} label="Duplicate" />
                  <MenuItem onClick={() => act('share')} icon={<Icon.Share width={16} />} label={p.published ? 'Unshare' : 'Share link'} />
                  <div style={{ height: 1, background: 'var(--color-line)', margin: '6px 4px' }} />
                  <div style={{ fontSize: 11, color: 'var(--color-ink-3)', padding: '4px 8px' }}>Move to</div>
                  <MenuItem onClick={() => move(null)} icon={<Icon.Home width={16} />} label="Root" />
                  {folders.slice(0, 6).map((f) => <MenuItem key={f.id} onClick={() => move(f.id)} icon={<Icon.Folder width={16} />} label={f.name} />)}
                  <div style={{ height: 1, background: 'var(--color-line)', margin: '6px 4px' }} />
                  <MenuItem onClick={async () => { await api.trashPresentation(p.id); onChange(); }} icon={<Icon.Trash width={16} />} label="Delete" danger />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MenuItem({ onClick, icon, label, danger }: { onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, color: danger ? '#b23c2b' : 'var(--color-ink)' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-paper-3)')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      {icon}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

function AiModal({ onClose, onDone }: { onClose: () => void; onDone: (id: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    if (!prompt.trim()) return;
    setLoading(true); setErr('');
    try { const r = await api.aiGenerate(prompt.trim(), count); onDone(r.id); }
    catch (e) { setErr(String(e).includes('501') ? 'Set ANTHROPIC_API_KEY on the server to use AI.' : 'Generation failed: ' + String(e).slice(0, 160)); }
    finally { setLoading(false); }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,26,24,0.35)', display: 'grid', placeItems: 'center', zIndex: 60 }}>
      <div className="card" onClick={(e) => e.stopPropagation()} style={{ width: 560, padding: 24, boxShadow: 'var(--shadow-pop)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--color-clay-wash)', color: 'var(--color-clay-ink)', display: 'grid', placeItems: 'center' }}><Icon.Sparkle width={18} /></span>
          <h2 className="t-title" style={{ fontSize: 22, margin: 0 }}>Create with AI</h2>
        </div>
        <p style={{ color: 'var(--color-ink-2)', fontSize: 14, marginTop: 4 }}>Describe your deck and Claude will draft it.</p>
        <textarea autoFocus className="input" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="e.g. A pitch for an AI note-taking app for students"
          style={{ height: 120, padding: 12, resize: 'vertical', marginTop: 8 }} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') go(); }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <label style={{ fontSize: 14, color: 'var(--color-ink-2)' }}>Slides</label>
          <input type="number" className="input" min={3} max={30} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 80, height: 34 }} />
          <div style={{ flex: 1 }} />
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-accent" onClick={go} disabled={loading || !prompt.trim()}>{loading ? 'Generating…' : 'Generate'}</button>
        </div>
        {err && <div style={{ color: '#b23c2b', fontSize: 13, marginTop: 10 }}>{err}</div>}
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(ts).toLocaleDateString();
}
