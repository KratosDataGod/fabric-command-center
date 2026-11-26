/**
 * Per-viewer shortcuts: pinned tiles and recently opened tiles. Stored in this
 * browser only. Entries are re-checked against the current profiles on read,
 * so removed tiles quietly drop out.
 */
export interface TileRef {
  profile: string;
  item: string;
}
export interface Personal {
  pins: TileRef[];
  recent: (TileRef & { at: number })[];
}

const KEY = 'fcc.personal.v1';
const MAX_RECENT = 8;
const MAX_PINS = 24;

const isRef = (x: unknown): x is TileRef =>
  typeof x === 'object' && x !== null && typeof (x as TileRef).profile === 'string' && typeof (x as TileRef).item === 'string';

export function sanitizePersonal(input: unknown, exists: (r: TileRef) => boolean): Personal {
  const raw = (typeof input === 'object' && input !== null ? input : {}) as Partial<Personal>;
  const pins = (Array.isArray(raw.pins) ? raw.pins : []).filter(isRef).filter(exists).slice(0, MAX_PINS).map(({ profile, item }) => ({ profile, item }));
  const recent = (Array.isArray(raw.recent) ? raw.recent : [])
    .filter(isRef)
    .filter(exists)
    .filter((r) => typeof r.at === 'number')
    .slice(0, MAX_RECENT)
    .map(({ profile, item, at }) => ({ profile, item, at }));
  return { pins, recent };
}

export function loadPersonal(exists: (r: TileRef) => boolean): Personal {
  try {
    return sanitizePersonal(JSON.parse(localStorage.getItem(KEY) ?? '{}'), exists);
  } catch {
    return { pins: [], recent: [] };
  }
}

export function storePersonal(p: Personal): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
    return true;
  } catch {
    return false;
  }
}

export const sameRef = (a: TileRef, b: TileRef) => a.profile === b.profile && a.item === b.item;

export function togglePin(p: Personal, ref: TileRef): Personal {
  const pinned = p.pins.some((x) => sameRef(x, ref));
  return { ...p, pins: pinned ? p.pins.filter((x) => !sameRef(x, ref)) : [...p.pins, ref].slice(0, MAX_PINS) };
}

export function addRecent(p: Personal, ref: TileRef, at = Date.now()): Personal {
  return { ...p, recent: [{ ...ref, at }, ...p.recent.filter((x) => !sameRef(x, ref))].slice(0, MAX_RECENT) };
}
