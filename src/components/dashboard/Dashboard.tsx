'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, type Folder, type PresListItem } from '@/lib/client-api';
import type { ProjectKind } from '@/lib/starter';
import { Thumb } from '@/components/Thumb';
import { Icon } from '@/components/icons';

type View = { kind: 'all' } | { kind: 'trash' } | { kind: 'folder'; id: string };
type Sort = 'updated' | 'created' | 'title';

const PAGE_SIZE = 24;
const CREATION_MODES: Array<{
  kind: ProjectKind;
  label: string;
  description: string;
  eyebrow: string;
  icon: React.ReactNode;
}> = [
  { kind: 'interface', label: 'Interface', description: 'Shape product screens and systems.', eyebrow: 'UI · UX', icon: <Icon.Grid width={20} /> },
  { kind: 'presentation', label: 'Presentation', description: 'Turn a narrative into a memorable deck.', eyebrow: 'STORY', icon: <Icon.Present width={20} /> },
  { kind: 'prototype', label: 'Prototype', description: 'Map a realistic, reviewable product flow.', eyebrow: 'FLOW', icon: <Icon.Layers width={20} /> },
];

export function Dashboard() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [items, setItems] = useState<PresListItem[]>([]);
  const [view, setView] = useState<View>({ kind: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [aiOpen, setAiOpen] = useState(false);
  const [aiDraft, setAiDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const reloadFolders = useCallback(async () => {
    try {
      setFolders(await api.listFolders());
    } catch (cause) {
      setError(`Could not load spaces: ${String(cause)}`);
    }
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (view.kind === 'trash') setItems(await api.listPresentations({ trashed: true }));
      else if (view.kind === 'folder') setItems(await api.listPresentations({ folderId: view.id }));
      else setItems(await api.listPresentations());
    } catch (cause) {
      setError(`Could not load projects: ${String(cause)}`);
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => { void reloadFolders(); }, [reloadFolders]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [view, q, sort]);

  const visible = useMemo(() => {
    let list = items;
    if (q.trim()) list = list.filter((item) => item.title.toLowerCase().includes(q.toLowerCase()));
    const by: Record<Sort, (a: PresListItem, b: PresListItem) => number> = {
      updated: (a, b) => b.updatedAt - a.updatedAt,
      created: (a, b) => b.createdAt - a.createdAt,
      title: (a, b) => a.title.localeCompare(b.title),
    };
    return [...list].sort(by[sort]);
  }, [items, q, sort]);

  const rootFolders = folders.filter((folder) => !folder.parentId).sort((a, b) => a.position - b.position);
  const childrenOf = (id: string) => folders.filter((folder) => folder.parentId === id).sort((a, b) => a.position - b.position);

  async function createProject(kind: ProjectKind) {
    setBusy(true);
    setError('');
    try {
      const folderId = view.kind === 'folder' ? view.id : null;
      const { id } = await api.createPresentation({ folderId, kind });
      router.push(`/edit/${id}`);
    } catch (cause) {
      setError(`Could not create the project: ${String(cause)}`);
      setBusy(false);
    }
  }

  async function createFolder() {
    const name = prompt('Folder name')?.trim();
    if (!name) return;
    const parentId = view.kind === 'folder' ? view.id : null;
    try {
      await api.createFolder(name, parentId);
      await reloadFolders();
    } catch (cause) {
      setError(`Could not create the folder: ${String(cause)}`);
    }
  }

  function openAi(promptText = '') {
    setAiDraft(promptText);
    setAiOpen(true);
  }

  const viewTitle = view.kind === 'trash'
    ? 'Recently deleted'
    : view.kind === 'folder'
      ? folders.find((folder) => folder.id === view.id)?.name ?? 'Folder'
      : 'Your work';

  return (
    <div className="dashboard-ambient">
      <div className="ambient-orb ambient-orb--violet" />
      <div className="ambient-orb ambient-orb--cyan" />
      <div className="dashboard-shell">
        <aside className="studio-sidebar glass-panel">
          <div className="brand-lockup">
            <div className="brand-mark" aria-hidden>W</div>
            <div>
              <div className="brand-name">WAI Design</div>
              <div className="brand-caption">Visual studio</div>
            </div>
          </div>

          <label className="search-field">
            <span className="sr-only">Search projects</span>
            <Icon.Search width={17} />
            <input placeholder="Search your work" value={q} onChange={(event) => setQ(event.target.value)} />
            <kbd>⌘K</kbd>
          </label>

          <nav className="studio-nav" aria-label="Workspace">
            <NavItem active={view.kind === 'all'} onClick={() => setView({ kind: 'all' })} icon={<Icon.Grid width={18} />} label="Your work" count={view.kind === 'all' ? items.length : undefined} />
            <NavItem active={view.kind === 'trash'} onClick={() => setView({ kind: 'trash' })} icon={<Icon.Trash width={18} />} label="Recently deleted" />
          </nav>

          <div className="sidebar-section-heading">
            <span>Spaces</span>
            <button className="icon-button" onClick={createFolder} title="New folder" aria-label="New folder"><Icon.Plus width={15} /></button>
          </div>
          <div className="sidebar-scroll">
            {rootFolders.map((folder) => (
              <FolderNode key={folder.id} folder={folder} childrenOf={childrenOf} view={view} setView={setView} onChange={reloadFolders} depth={0} />
            ))}
          </div>

          <div className="sidebar-footnote">
            <span className="status-dot" />
            Autosave is on
          </div>
        </aside>

        <main className="studio-main">
          <header className="studio-topbar">
            <div>
              <div className="eyebrow">WAIWAI WORKSPACE</div>
              <h1>{viewTitle}</h1>
            </div>
            <div className="topbar-actions">
              <select className="select-control" aria-label="Sort projects" value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                <option value="updated">Last updated</option>
                <option value="created">Date created</option>
                <option value="title">Title</option>
              </select>
              <button className="btn btn-primary" onClick={() => openAi()}><Icon.Sparkle width={17} /> Create with AI</button>
            </div>
          </header>

          {view.kind === 'all' && !q && (
            <section className="studio-hero">
              <div className="hero-copy">
                <div className="hero-kicker"><span /> FROM THOUGHT TO FORM</div>
                <h2>Make the idea<br /><em>visible.</em></h2>
                <p>Design interfaces, shape stories, and prototype the moments between them—all in one calm canvas.</p>
              </div>
              <form className="prompt-composer glass-panel" onSubmit={(event) => { event.preventDefault(); if (aiDraft.trim()) openAi(aiDraft); }}>
                <div className="prompt-icon"><Icon.Sparkle width={19} /></div>
                <input aria-label="Describe what you want to create" placeholder="Describe what you want to make…" value={aiDraft} onChange={(event) => setAiDraft(event.target.value)} />
                <button type="submit" disabled={!aiDraft.trim()}>Generate <span>↗</span></button>
                <div className="prompt-hint">Try “A product launch deck for an AI travel planner”</div>
              </form>
            </section>
          )}

          {view.kind !== 'trash' && (
            <section className="creation-section">
              <div className="section-heading">
                <div><span className="eyebrow">START WITH INTENT</span><h2>Choose a canvas</h2></div>
                <button className="text-button" onClick={createFolder}><Icon.Folder width={16} /> New folder</button>
              </div>
              <div className="mode-grid">
                {CREATION_MODES.map((mode) => <ModeCard key={mode.kind} {...mode} onClick={() => void createProject(mode.kind)} />)}
              </div>
            </section>
          )}

          <section className="library-section">
            <div className="section-heading section-heading--library">
              <div>
                <span className="eyebrow">LIBRARY</span>
                <h2>{view.kind === 'trash' ? 'Recoverable projects' : q ? `Results for “${q}”` : viewTitle}</h2>
              </div>
              <span className="project-count">{visible.length} {visible.length === 1 ? 'project' : 'projects'}</span>
            </div>

            {error && <div className="error-banner" role="alert">{error}<button onClick={() => void reload()}>Try again</button></div>}
            {loading ? (
              <div className="project-grid" aria-label="Loading projects">
                {Array.from({ length: 6 }).map((_, index) => <div className="project-skeleton" key={index} />)}
              </div>
            ) : visible.length === 0 ? (
              <div className="empty-state">
                <div className="empty-mark"><Icon.Grid width={23} /></div>
                <h3>{view.kind === 'trash' ? 'Nothing waiting here.' : q ? 'No matching work.' : 'A quiet canvas, ready when you are.'}</h3>
                <p>{view.kind === 'trash' ? 'Deleted projects will appear here.' : 'Start with an interface, presentation, prototype, or a prompt.'}</p>
              </div>
            ) : (
              <>
                <div className="project-grid">
                  {visible.slice(0, visibleCount).map((project) => (
                    <Card key={project.id} project={project} trash={view.kind === 'trash'} folders={folders} onChange={reload} />
                  ))}
                </div>
                {visibleCount < visible.length && <button className="load-more" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>Show more work</button>}
              </>
            )}
          </section>
        </main>
      </div>

      {aiOpen && <AiModal initialPrompt={aiDraft} onClose={() => setAiOpen(false)} onDone={(id) => router.push(`/edit/${id}`)} />}
      {busy && <div className="busy-overlay" role="status"><span className="busy-spinner" /> Preparing your canvas…</div>}
    </div>
  );
}

function NavItem({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return <button className={`nav-item${active ? ' is-active' : ''}`} onClick={onClick}>{icon}<span>{label}</span>{count !== undefined && <small>{count}</small>}</button>;
}

function FolderNode({ folder, childrenOf, view, setView, onChange, depth }: { folder: Folder; childrenOf: (id: string) => Folder[]; view: View; setView: (next: View) => void; onChange: () => void | Promise<void>; depth: number }) {
  const [open, setOpen] = useState(depth === 0);
  const kids = childrenOf(folder.id);
  const active = view.kind === 'folder' && view.id === folder.id;

  async function rename() {
    const nextName = prompt('Rename folder', folder.name)?.trim();
    if (nextName) { await api.renameFolder(folder.id, nextName); await onChange(); }
  }
  async function remove() {
    if (!confirm(`Delete folder “${folder.name}”? Projects inside move to Recently deleted.`)) return;
    await api.deleteFolder(folder.id);
    if (view.kind === 'folder' && view.id === folder.id) setView({ kind: 'all' });
    await onChange();
  }

  return (
    <div className="folder-branch">
      <div className={`folder-row${active ? ' is-active' : ''}`} style={{ paddingLeft: 8 + depth * 14 }}>
        <button className={`folder-toggle${kids.length ? '' : ' is-hidden'}`} onClick={() => setOpen((value) => !value)} aria-label={open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}>
          {open ? <Icon.ChevronDown width={13} /> : <Icon.Chevron width={13} />}
        </button>
        <button className="folder-name" onClick={() => setView({ kind: 'folder', id: folder.id })} onDoubleClick={() => void rename()}><Icon.Folder width={15} /><span>{folder.name}</span></button>
        <button className="folder-delete" onClick={() => void remove()} aria-label={`Delete folder ${folder.name}`}><Icon.Trash width={13} /></button>
      </div>
      {open && kids.map((child) => <FolderNode key={child.id} folder={child} childrenOf={childrenOf} view={view} setView={setView} onChange={onChange} depth={depth + 1} />)}
    </div>
  );
}

function ModeCard({ kind, label, description, eyebrow, icon, onClick }: (typeof CREATION_MODES)[number] & { onClick: () => void }) {
  return (
    <button className={`mode-card mode-card--${kind}`} onClick={onClick}>
      <div className={`mode-preview mode-preview--${kind}`} aria-hidden>
        <span className="preview-dot preview-dot--one" /><span className="preview-dot preview-dot--two" />
        <span className="preview-line preview-line--one" /><span className="preview-line preview-line--two" /><span className="preview-line preview-line--three" />
        <span className="preview-card preview-card--one" /><span className="preview-card preview-card--two" />
      </div>
      <div className="mode-card-body">
        <span className="mode-icon">{icon}</span>
        <span><small>{eyebrow}</small><strong>{label}</strong><em>{description}</em></span>
        <b aria-hidden>↗</b>
      </div>
    </button>
  );
}

function Card({ project, trash, folders, onChange }: { project: PresListItem; trash: boolean; folders: Folder[]; onChange: () => void | Promise<void> }) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(project.title);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (event: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const open = () => { if (!trash) router.push(`/edit/${project.id}`); };
  async function act(action: 'duplicate' | 'restore' | 'destroy') {
    if (action === 'destroy' && !confirm('Delete this project forever?')) return;
    const result = await api.presAction(project.id, action);
    if (action === 'duplicate' && result.id) router.push(`/edit/${result.id}`);
    else await onChange();
    setMenu(false);
  }
  async function toggleShare() {
    const on = !project.published;
    const result = await api.presAction(project.id, 'share', on);
    if (on && result.token) {
      const url = `${location.origin}/v/${result.token}`;
      await navigator.clipboard?.writeText(url);
      alert(`Public link copied:\n${url}`);
    }
    await onChange();
    setMenu(false);
  }
  async function rename() {
    setRenaming(false);
    if (name.trim() && name !== project.title) { await api.renamePresentation(project.id, name.trim()); await onChange(); }
  }
  async function move(folderId: string | null) { await api.movePresentation(project.id, folderId); await onChange(); setMenu(false); }

  return (
    <article className="project-card animate-rise">
      <div className="project-thumb" onClick={open} role={trash ? undefined : 'button'} aria-label={trash ? undefined : `Open ${project.title}`} tabIndex={trash ? undefined : 0} onKeyDown={(event) => { if (!trash && (event.key === 'Enter' || event.key === ' ')) open(); }}>
        <Thumb slide={project.thumb} />
        <span className="canvas-badge">CANVAS</span>
        {project.published ? <span className="shared-badge"><Icon.Share width={12} /> Shared</span> : null}
        {!trash && <button className="quick-present" onClick={(event) => { event.stopPropagation(); router.push(`/present/${project.id}`); }} title="Present" aria-label={`Present ${project.title}`}><Icon.Play width={15} /></button>}
      </div>
      <div className="project-meta">
        <div className="project-title-block">
          {renaming ? (
            <input autoFocus className="inline-rename" value={name} onChange={(event) => setName(event.target.value)} onBlur={() => void rename()} onKeyDown={(event) => { if (event.key === 'Enter') void rename(); if (event.key === 'Escape') { setRenaming(false); setName(project.title); } }} />
          ) : <h3 title={project.title}>{project.title}</h3>}
          <p>{project.slideCount} {project.slideCount === 1 ? 'frame' : 'frames'} <span>·</span> {timeAgo(project.updatedAt)}</p>
        </div>
        <div className="project-menu-wrap" ref={menuRef}>
          <button className="project-menu-button" onClick={() => setMenu((value) => !value)} aria-label={`More actions for ${project.title}`}><Icon.Dots width={18} /></button>
          {menu && (
            <div className="project-menu glass-panel">
              {trash ? (
                <><MenuItem onClick={() => void act('restore')} icon={<Icon.Undo width={16} />} label="Restore" /><MenuItem onClick={() => void act('destroy')} icon={<Icon.Trash width={16} />} label="Delete forever" danger /></>
              ) : (
                <>
                  <MenuItem onClick={open} icon={<Icon.Edit width={16} />} label="Open canvas" />
                  <MenuItem onClick={() => { setMenu(false); setRenaming(true); }} icon={<Icon.Type width={16} />} label="Rename" />
                  <MenuItem onClick={() => void act('duplicate')} icon={<Icon.Duplicate width={16} />} label="Duplicate" />
                  <MenuItem onClick={() => void toggleShare()} icon={<Icon.Share width={16} />} label={project.published ? 'Unshare' : 'Copy share link'} />
                  <div className="menu-separator" /><div className="menu-label">Move to</div>
                  <MenuItem onClick={() => void move(null)} icon={<Icon.Home width={16} />} label="Workspace root" />
                  {folders.slice(0, 6).map((folder) => <MenuItem key={folder.id} onClick={() => void move(folder.id)} icon={<Icon.Folder width={16} />} label={folder.name} />)}
                  <div className="menu-separator" />
                  <MenuItem onClick={async () => { await api.trashPresentation(project.id); await onChange(); }} icon={<Icon.Trash width={16} />} label="Move to deleted" danger />
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function MenuItem({ onClick, icon, label, danger }: { onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean }) {
  return <button className={`menu-item${danger ? ' is-danger' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function AiModal({ initialPrompt, onClose, onDone }: { initialPrompt: string; onClose: () => void; onDone: (id: string) => void }) {
  const [promptText, setPromptText] = useState(initialPrompt);
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    if (!promptText.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.aiGenerate(promptText.trim(), count);
      onDone(result.id);
    } catch (cause) {
      setError(String(cause).includes('501') ? 'Add ANTHROPIC_API_KEY on the server to use AI creation.' : `Generation failed: ${String(cause).slice(0, 160)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="ai-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="ai-title" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon.Close width={18} /></button>
        <div className="ai-modal-mark"><Icon.Sparkle width={22} /></div>
        <span className="eyebrow">CREATE WITH AI</span>
        <h2 id="ai-title">What are we making?</h2>
        <p>Describe the audience, goal, and feeling. WAI will shape a complete first draft you can edit.</p>
        <textarea autoFocus value={promptText} onChange={(event) => setPromptText(event.target.value)} placeholder="A concise launch deck for a calm AI travel planner…" onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') void generate(); }} />
        <div className="ai-modal-footer">
          <label>Frames <input type="number" min={3} max={30} value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
          <span>⌘↵ to generate</span>
          <button className="btn btn-primary" onClick={() => void generate()} disabled={loading || !promptText.trim()}>{loading ? 'Creating…' : 'Generate canvas'} <b>↗</b></button>
        </div>
        {error && <div className="modal-error" role="alert">{error}</div>}
      </div>
    </div>
  );
}

function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60); if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24); if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
