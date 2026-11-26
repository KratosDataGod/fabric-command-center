import { Bookmark, CornerDownLeft, FileBarChart2, LayoutDashboard, Link2, Search, Star, Zap } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import { profiles } from '@/config';
import { loadViews, type SavedView } from '@/state/views';

import { ProfileGlyph } from './icons';
import { usePersonal } from './personal-context';
import { allTiles, score, type TileHit } from './search';

export interface PaletteAction {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

type Entry = { key: string; group: string; icon: ReactNode; label: string; sub?: string; rank: number; run: () => void };

const TILE_ICON = { dashboard: LayoutDashboard, report: FileBarChart2, link: Link2 } as const;
const GROUPS = ['Pinned', 'Content', 'Saved views', 'Profiles', 'Actions'];

/** Ctrl/Cmd + K: jump to any tile, profile or saved view across the whole app. */
export function CommandPalette(p: {
  onClose: () => void;
  onOpenTile: (hit: TileHit) => void;
  onPickProfile: (id: string) => void;
  onOpenView: (view: SavedView) => void;
  actions: PaletteAction[];
}) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const restore = useRef<Element | null>(null);
  const personal = usePersonal();
  const views = useMemo(() => loadViews(), []);

  useEffect(() => {
    restore.current = document.activeElement;
    input.current?.focus();
    return () => (restore.current as HTMLElement | null)?.focus?.();
  }, []);

  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];
    const done = (fn: () => void) => () => {
      p.onClose();
      fn();
    };
    for (const hit of allTiles) {
      const pinned = personal.isPinned({ profile: hit.profileId, item: hit.item.id });
      const rank = score(query, hit.item.title, hit.profileName, hit.section, hit.item.description, hit.item.source, hit.item.type);
      if (!rank) continue;
      const Icon = TILE_ICON[hit.item.type];
      out.push({
        key: `t:${hit.profileId}:${hit.item.id}`,
        group: pinned && !query ? 'Pinned' : 'Content',
        icon: pinned ? <Star className="icon-size-200" aria-hidden /> : <Icon className="icon-size-200" aria-hidden />,
        label: hit.item.title,
        sub: `${hit.profileName} · ${hit.section}`,
        rank: rank + (pinned ? 2 : 0),
        run: done(() => p.onOpenTile(hit)),
      });
    }
    for (const v of views) {
      const rank = score(query, v.name, 'view');
      if (rank) out.push({ key: `v:${v.id}`, group: 'Saved views', icon: <Bookmark className="icon-size-200" aria-hidden />, label: v.name, sub: 'Saved view', rank, run: done(() => p.onOpenView(v)) });
    }
    for (const pr of profiles) {
      const rank = score(query, pr.name, pr.description, 'profile');
      if (rank) out.push({ key: `p:${pr.id}`, group: 'Profiles', icon: <ProfileGlyph icon={pr.icon} />, label: pr.name, sub: 'Switch profile', rank, run: done(() => p.onPickProfile(pr.id)) });
    }
    for (const a of p.actions) {
      const rank = score(query, a.label, a.hint, 'action');
      if (rank) out.push({ key: `a:${a.id}`, group: 'Actions', icon: <Zap className="icon-size-200" aria-hidden />, label: a.label, sub: a.hint, rank, run: done(a.run) });
    }
    return out
      .sort((a, b) => (query ? b.rank - a.rank : GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group)))
      .slice(0, 60);
  }, [query, views, personal, p]);

  const groups = query ? [{ name: 'Results', items: entries }] : GROUPS.map((g) => ({ name: g, items: entries.filter((e) => e.group === g) })).filter((g) => g.items.length);
  const flat = groups.flatMap((g) => g.items);
  const current = Math.min(active, Math.max(0, flat.length - 1));

  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [current]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') setActive((i) => Math.min(flat.length - 1, i + 1));
    else if (e.key === 'ArrowUp') setActive((i) => Math.max(0, i - 1));
    else if (e.key === 'Home') setActive(0);
    else if (e.key === 'End') setActive(flat.length - 1);
    else if (e.key === 'Enter') flat[current]?.run();
    else if (e.key === 'Escape') p.onClose();
    else return;
    e.preventDefault();
  };

  const offsets = groups.map((_, gi) => groups.slice(0, gi).reduce((a, g) => a + g.items.length, 0));
  return (
    <div className="hud-palette-backdrop" onMouseDown={(e) => e.target === e.currentTarget && p.onClose()}>
      <div className="hud-palette" role="dialog" aria-modal="true" aria-label="Search everything" onKeyDown={onKey}>
        <div className="hud-palette-search">
          <Search className="icon-size-300" aria-hidden />
          <input
            ref={input}
            className="hud-palette-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Search dashboards, reports, links, views…"
            role="combobox"
            aria-expanded="true"
            aria-controls="fcc-palette-list"
            aria-activedescendant={flat[current] ? `fcc-pal-${current}` : undefined}
            aria-label="Search everything"
          />
          <kbd className="hud-kbd">Esc</kbd>
        </div>
        <ul ref={list} id="fcc-palette-list" className="hud-palette-list" role="listbox" aria-label="Results">
          {flat.length === 0 ? <li className="hud-hint hud-palette-empty">Nothing matches “{query}”.</li> : null}
          {groups.map((g, gi) => (
            <li key={g.name} role="presentation">
              <p className="hud-label hud-palette-group">{g.name}</p>
              <ul role="presentation">
                {g.items.map((e, j) => {
                  const i = offsets[gi]! + j;
                  return (
                    <li
                      key={e.key}
                      id={`fcc-pal-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={i === current}
                      className="hud-palette-item"
                      onMouseMove={() => setActive(i)}
                      onClick={e.run}
                    >
                      {e.icon}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{e.label}</span>
                        {e.sub ? <span className="hud-hint block truncate">{e.sub}</span> : null}
                      </span>
                      {i === current ? <CornerDownLeft className="icon-size-200" aria-hidden /> : null}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
        <p className="hud-hint hud-palette-foot">↑ ↓ to move · Enter to open · Ctrl K anywhere</p>
      </div>
    </div>
  );
}
