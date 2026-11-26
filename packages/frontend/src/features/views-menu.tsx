import { Bookmark, ClipboardPaste, Copy, Link2, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { activeKeys, type Dimension, type Filters } from '@/state/filters';
import { decodeViewCode, encodeViewCode, loadViews, newViewId, type SavedView, storeViews } from '@/state/views';
import { useToast } from '@/shell/toast-context';

import { copyText } from './actions';
import { Drawer } from './drawer';

export interface ViewsMenuProps {
  profileId: string;
  itemId: string;
  filters: Filters;
  dims: Dimension[];
  onApply: (filters: Filters) => void;
  /** Opens a view that belongs to another dashboard (from a pasted code). */
  onOpenElsewhere: (profileId: string, itemId: string, filters: Filters) => void;
  dimsFor: (profileId: string, itemId: string) => Dimension[] | undefined;
  /** Present when the Fabric portal supports deep links: the address bar already holds a shareable link. */
  deepLinks: boolean;
  onClose: () => void;
}

/** Save, reopen and share named filter states ("capture report views"). */
export function ViewsMenu(p: ViewsMenuProps) {
  const toast = useToast();
  const [views, setViews] = useState<SavedView[]>(() => loadViews());
  const [name, setName] = useState('');
  const [paste, setPaste] = useState('');
  const mine = views.filter((v) => v.profileId === p.profileId && v.itemId === p.itemId);
  const describe = (f: Filters) =>
    activeKeys(f).map((k) => `${p.dims.find((d) => d.id === k)?.label ?? k}: ${(f[k] ?? []).join(', ')}`).join(' · ') || 'No filters';

  const persist = (next: SavedView[]) => {
    setViews(next);
    if (!storeViews(next)) toast('This browser is blocking storage, so views will not be kept after you close the app.', 'warn');
  };
  const save = () => {
    const label = name.trim() || describe(p.filters).slice(0, 60);
    persist([{ id: newViewId(), name: label, profileId: p.profileId, itemId: p.itemId, filters: p.filters, savedAt: new Date().toISOString() }, ...views]);
    setName('');
    toast(`Saved "${label}".`);
  };
  const share = async (f: Filters, n?: string) => {
    const code = encodeViewCode({ p: p.profileId, i: p.itemId, f, n });
    toast((await copyText(code)) ? 'View code copied. Anyone can paste it under Saved views.' : 'Clipboard is blocked here.', 'ok');
  };
  const openCode = () => {
    const decoded = decodeViewCode(paste, p.dimsFor);
    if (!decoded) return toast('That is not a valid view code for this app.', 'warn');
    setPaste('');
    if (decoded.p === p.profileId && decoded.i === p.itemId) p.onApply(decoded.f);
    else p.onOpenElsewhere(decoded.p, decoded.i, decoded.f);
    p.onClose();
  };

  return (
    <Drawer title="Saved views" onClose={p.onClose}>
      <section className="hud-filter">
        <p className="hud-label">Current view</p>
        <p className="mb-200">{describe(p.filters)}</p>
        <div className="flex gap-200">
          <input className="hud-input flex-1" value={name} maxLength={80} placeholder="Name this view" aria-label="View name" onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
          <button type="button" className="hud-btn" onClick={save}>
            <Bookmark className="icon-size-200" aria-hidden /> Save
          </button>
        </div>
        <button type="button" className="hud-link mt-200" onClick={() => share(p.filters)}>
          <Copy className="icon-size-100 inline" aria-hidden /> Copy a share code for this view
        </button>
        {p.deepLinks ? (
          <p className="hud-hint mt-200">
            <Link2 className="icon-size-100 inline" aria-hidden /> The Fabric address bar also tracks this view. Copy the browser URL to share it.
          </p>
        ) : null}
      </section>

      <section className="hud-filter">
        <p className="hud-label">My views ({mine.length})</p>
        {mine.length === 0 ? <p className="hud-hint">Nothing saved yet.</p> : null}
        <ul className="flex flex-col gap-200">
          {mine.map((v) => (
            <li key={v.id} className="hud-view-row">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { p.onApply(v.filters); p.onClose(); }}>
                <span className="block truncate font-semibold">{v.name}</span>
                <span className="hud-hint block truncate">{describe(v.filters)}</span>
              </button>
              <button type="button" className="hud-icon-btn" aria-label={`Copy share code for ${v.name}`} onClick={() => share(v.filters, v.name)}>
                <Copy className="icon-size-200" aria-hidden />
              </button>
              <button type="button" className="hud-icon-btn" aria-label={`Delete ${v.name}`} onClick={() => persist(views.filter((x) => x.id !== v.id))}>
                <Trash2 className="icon-size-200" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="hud-filter">
        <p className="hud-label">Open a shared view</p>
        <div className="flex gap-200">
          <input className="hud-input flex-1" value={paste} placeholder="Paste a FCC1. code" aria-label="View code" onChange={(e) => setPaste(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && openCode()} />
          <button type="button" className="hud-btn" onClick={openCode}>
            <ClipboardPaste className="icon-size-200" aria-hidden /> Open
          </button>
        </div>
      </section>
    </Drawer>
  );
}
