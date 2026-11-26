import { useMemo, useState } from 'react';

import { useDashboard } from '@/dashboard/context';
import { valuesQuery } from '@/dax/builder';
import { num } from '@/data/rows';
import { useRows } from '@/data/use-rows';
import { HudError } from '@/hud/panel';
import { type Dimension, type FilterValue, type Filters, setValues } from '@/state/filters';

import { Drawer } from './drawer';

function DimensionFilter({ dim, filters, onChange }: { dim: Dimension; filters: Filters; onChange: (f: Filters) => void }) {
  const { model, dims, fmt } = useDashboard();
  const [search, setSearch] = useState('');
  const q = useMemo(() => valuesQuery(model, dim, filters, dims), [model, dim, filters, dims]);
  const res = useRows(model.connector, q);
  const selected = filters[dim.id] ?? [];
  const members = (res.data ?? []).map((r) => ({ value: r[0] as FilterValue, total: num(r[1]) }));
  const shown = members.filter((m) => String(m.value).toLowerCase().includes(search.toLowerCase())).slice(0, 200);
  const toggle = (v: FilterValue) =>
    onChange(setValues(filters, dim.id, selected.some((s) => s === v) ? selected.filter((s) => s !== v) : [...selected, v]));

  return (
    <fieldset className="hud-filter">
      <legend className="flex w-full items-center justify-between">
        <span className="hud-title">{dim.label}</span>
        {selected.length ? (
          <button type="button" className="hud-link" onClick={() => onChange(setValues(filters, dim.id, []))}>
            Clear ({selected.length})
          </button>
        ) : null}
      </legend>
      {members.length > 8 ? (
        <input className="hud-input" type="search" placeholder={`Search ${dim.label.toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label={`Search ${dim.label}`} />
      ) : null}
      {res.error ? <HudError message={res.error} onRetry={res.refetch} /> : null}
      {!res.data && !res.error ? <p className="hud-hint">Loading…</p> : null}
      <ul className="hud-filter-list">
        {shown.map((m) => {
          const on = selected.some((s) => s === m.value);
          return (
            <li key={String(m.value)}>
              <label className="hud-check">
                <input type="checkbox" checked={on} onChange={() => toggle(m.value)} />
                <span className="truncate">{String(m.value)}</span>
                <span className="hud-mono ml-auto" style={{ color: 'var(--hud-dim)' }}>{fmt.value(m.total)}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {members.length > shown.length && !search ? <p className="hud-hint">Showing the top {shown.length}. Search to find more.</p> : null}
    </fieldset>
  );
}

/** Multi-select slicers for every dimension in the model. Each list respects the other filters. */
export function FiltersPane({ onClose, onChange }: { onClose: () => void; onChange: (f: Filters) => void }) {
  const { dims, filters } = useDashboard();
  return (
    <Drawer title="Filters" onClose={onClose}>
      <p className="hud-hint mb-300">Tip: Ctrl or Shift + click any chart to add to a selection.</p>
      {dims.map((d) => (
        <DimensionFilter key={d.id} dim={d} filters={filters} onChange={onChange} />
      ))}
      <button type="button" className="hud-btn mt-300" onClick={() => onChange({})}>
        Clear all filters
      </button>
    </Drawer>
  );
}
