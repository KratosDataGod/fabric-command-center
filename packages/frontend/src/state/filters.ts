import type { ModelConfig } from '@/config';

export type FilterValue = string | number;
/** Active selections per dimension id ('time', 'geo', 'category' or an extraFilters id). */
export type Filters = Record<string, FilterValue[]>;

export interface Dimension {
  id: string;
  label: string;
  column: string;
  role: 'time' | 'geo' | 'category' | 'extra';
}

/** Every filterable dimension declared in model.json, in display order. */
export function dimensionsOf(model: ModelConfig): Dimension[] {
  const out: Dimension[] = [];
  const d = model.dimensions;
  if (d.time) out.push({ id: 'time', label: d.time.label, column: d.time.column, role: 'time' });
  if (d.geo) out.push({ id: 'geo', label: d.geo.label, column: d.geo.column, role: 'geo' });
  if (d.category) out.push({ id: 'category', label: d.category.label, column: d.category.column, role: 'category' });
  for (const f of model.extraFilters ?? []) out.push({ id: f.id, label: f.label, column: f.column, role: 'extra' });
  return out;
}

export function activeKeys(filters: Filters): string[] {
  return Object.keys(filters).filter((k) => (filters[k]?.length ?? 0) > 0);
}

/**
 * Click behaviour shared by every visual:
 * - plain click selects only that value, or clears it if it was the only one;
 * - additive click (Ctrl/Cmd/Shift) adds or removes it from the selection.
 */
export function toggleValue(filters: Filters, key: string, value: FilterValue, additive: boolean): Filters {
  const current = filters[key] ?? [];
  const has = current.some((v) => v === value);
  let next: FilterValue[];
  if (additive) next = has ? current.filter((v) => v !== value) : [...current, value];
  else next = has && current.length === 1 ? [] : [value];
  return setValues(filters, key, next);
}

export function setValues(filters: Filters, key: string, values: FilterValue[]): Filters {
  const next = { ...filters };
  if (values.length === 0) delete next[key];
  else next[key] = values;
  return next;
}

export function clearKey(filters: Filters, key: string): Filters {
  return setValues(filters, key, []);
}

/** Keeps only known dimensions and primitive values: launch state and pasted codes are untrusted. */
export function sanitizeFilters(input: unknown, dims: Dimension[]): Filters {
  if (!input || typeof input !== 'object') return {};
  const known = new Set(dims.map((d) => d.id));
  const out: Filters = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!known.has(k) || !Array.isArray(v)) continue;
    const vals = v
      .filter((x): x is FilterValue => (typeof x === 'string' && x.length <= 200) || (typeof x === 'number' && Number.isFinite(x)))
      .slice(0, 100);
    if (vals.length) out[k] = vals;
  }
  return out;
}
