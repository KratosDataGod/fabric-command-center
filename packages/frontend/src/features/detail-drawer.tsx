import { ArrowDown, ArrowUp, Download } from 'lucide-react';
import { useMemo, useState } from 'react';

import { useDashboard } from '@/dashboard/context';
import { detailQuery } from '@/dax/builder';
import { num } from '@/data/rows';
import { useRows } from '@/data/use-rows';
import { HudError } from '@/hud/panel';
import { activeKeys } from '@/state/filters';
import { useToast } from '@/shell/toast-context';

import { exportCsv } from './actions';
import { Drawer } from './drawer';

/** Drill-through: the detail rows behind the current selection. */
export function DetailDrawer({ onClose }: { onClose: () => void }) {
  const { model, dims, filters, series, fmt } = useDashboard();
  const toast = useToast();
  const q = useMemo(() => detailQuery(model, filters, dims), [model, filters, dims]);
  const res = useRows(model.connector, q);
  const cols = model.detail?.columns ?? [];
  const header = [...cols.map((c) => c.label), ...series.map((s) => s.label), 'Total'];
  const numeric = (i: number) => i >= cols.length;
  const [sort, setSort] = useState<{ col: number; desc: boolean }>({ col: header.length - 1, desc: true });
  const rows = useMemo(() => {
    const data = [...(res.data ?? [])];
    data.sort((a, b) => {
      const x = a[sort.col];
      const y = b[sort.col];
      const c = numeric(sort.col) ? num(x) - num(y) : String(x ?? '').localeCompare(String(y ?? ''));
      return sort.desc ? -c : c;
    });
    return data;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- numeric depends only on cols.length, which tracks model
  }, [res.data, sort, cols.length]);
  const scope = activeKeys(filters)
    .map((k) => `${dims.find((d) => d.id === k)?.label}: ${(filters[k] ?? []).join(', ')}`)
    .join(' · ');

  if (!q) {
    return (
      <Drawer title="Detail" onClose={onClose}>
        <p>This model has no detail columns. Add a <code>detail</code> section to its file in <code>customize/models/</code>.</p>
      </Drawer>
    );
  }
  return (
    <Drawer title="Detail" onClose={onClose} wide>
      <div className="mb-300 flex flex-wrap items-center justify-between gap-300">
        <p className="hud-hint">{scope || 'All data'} · top {model.detail?.maxRows ?? 500} rows by total</p>
        <button type="button" className="hud-btn" disabled={!res.data}
          onClick={() => toast(exportCsv(`detail ${scope}`, header, rows) ? 'CSV downloaded.' : 'Downloads are blocked here.', 'ok')}>
          <Download className="icon-size-200" aria-hidden /> Export CSV
        </button>
      </div>
      {res.error ? <HudError message={res.error} onRetry={res.refetch} /> : null}
      {!res.data && !res.error ? <div className="relative h-[200px]"><div className="hud-skel" /></div> : null}
      {res.data ? (
        <div className="hud-table-wrap">
          <table className="hud-table">
            <thead>
              <tr>
                {header.map((h, i) => (
                  <th key={h} scope="col" aria-sort={sort.col === i ? (sort.desc ? 'descending' : 'ascending') : 'none'} className={numeric(i) ? 'num' : ''}>
                    <button type="button" onClick={() => setSort((s) => ({ col: i, desc: s.col === i ? !s.desc : numeric(i) }))}>
                      {h} {sort.col === i ? (sort.desc ? <ArrowDown className="icon-size-100 inline" aria-hidden /> : <ArrowUp className="icon-size-100 inline" aria-hidden />) : null}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {header.map((h, j) => (
                    <td key={h} className={numeric(j) ? 'num' : ''}>{numeric(j) ? fmt.full(num(r[j])) : String(r[j] ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="hud-hint p-300">No rows for this selection.</p> : null}
        </div>
      ) : null}
    </Drawer>
  );
}
