import { type Dimension, type Filters, sanitizeFilters } from './filters';

export interface SavedView {
  id: string;
  name: string;
  /** Profile and tile the view belongs to. */
  profileId: string;
  itemId: string;
  filters: Filters;
  savedAt: string;
}

const KEY = 'fcc.views.v1';

export function loadViews(): SavedView[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? (list.filter((v) => v && typeof v === 'object' && typeof v.name === 'string') as SavedView[]) : [];
  } catch {
    return [];
  }
}

export function storeViews(views: SavedView[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(views.slice(0, 200)));
    return true;
  } catch {
    return false;
  }
}

export function newViewId(): string {
  return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** A pasteable code for a view: works where deep links aren't available. */
export interface ViewCode {
  v: 1;
  p: string;
  i: string;
  f: Filters;
  n?: string;
}

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b + '='.repeat((4 - (b.length % 4)) % 4))));
}

export function encodeViewCode(code: Omit<ViewCode, 'v'>): string {
  return `FCC1.${toBase64Url(JSON.stringify({ v: 1, ...code }))}`;
}

/** Decodes and validates a pasted code. Untrusted input: only known shapes get through. */
export function decodeViewCode(text: string, dimsFor: (profileId: string, itemId: string) => Dimension[] | undefined): ViewCode | undefined {
  const m = /FCC1\.([A-Za-z0-9_-]{4,8000})/.exec(text.trim());
  if (!m) return undefined;
  try {
    const raw = JSON.parse(fromBase64Url(m[1]!)) as Partial<ViewCode>;
    if (raw.v !== 1 || typeof raw.p !== 'string' || typeof raw.i !== 'string') return undefined;
    const dims = dimsFor(raw.p, raw.i);
    if (!dims) return undefined;
    return { v: 1, p: raw.p, i: raw.i, f: sanitizeFilters(raw.f, dims), n: typeof raw.n === 'string' ? raw.n.slice(0, 80) : undefined };
  } catch {
    return undefined;
  }
}
