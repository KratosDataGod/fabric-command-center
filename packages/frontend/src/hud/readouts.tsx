import { useDashboard } from '@/dashboard/context';
import { ratio } from '@/data/format';
import type { Kpis } from '@/data/rows';

import { CountUp } from './count-up';

interface Tile {
  label: string;
  value: number | undefined;
  format: (n: number) => string;
  accent: string;
  sub: string;
  fill: number;
}

function Readout({ label, value, format, accent, sub, fill }: Tile) {
  const segments = 14;
  const lit = Math.round(Math.max(0, Math.min(1, fill)) * segments);
  return (
    <div className="relative flex min-w-0 flex-col justify-between gap-200 p-300" style={{ border: '1px solid var(--hud-line-soft)', background: 'var(--hud-panel-2)' }}>
      <div className="hud-label truncate">{label}</div>
      <div className="hud-split truncate" style={{ fontSize: 'clamp(22px, 2.2vw, 34px)', lineHeight: 1.05, color: 'var(--hud-ink)' }}>
        {value === undefined ? '—' : <CountUp value={value} format={format} />}
      </div>
      <div className="flex gap-100" aria-hidden>
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} style={{ flex: 1, height: 6, background: i < lit ? accent : 'var(--hud-line-soft)', boxShadow: i < lit ? `0 0 6px ${accent}` : 'none', transition: 'background .6s' }} />
        ))}
      </div>
      <div className="hud-mono truncate" style={{ fontSize: 11, color: 'var(--hud-dim)' }}>{sub}</div>
    </div>
  );
}

/** Up to four tiles: each series, then units and value per unit when the model has units. */
export function Readouts({ kpis }: { kpis: Kpis }) {
  const { series, fmt } = useDashboard();
  const tiles: Tile[] = series.map((s, i) => ({
    label: s.label,
    value: kpis.values[i],
    format: fmt.value,
    accent: s.color,
    fill: ratio(kpis.values[i] ?? 0, kpis.total) ?? 0,
    sub: kpis.units ? `${fmt.count(kpis.units[i] ?? 0)} UNITS` : `${fmt.pct(ratio(kpis.values[i] ?? 0, kpis.total) ?? 0)} OF TOTAL`,
  }));
  if (series.length === 1) tiles.unshift({ label: 'Total', value: kpis.total, format: fmt.value, accent: 'var(--hud-s1)', fill: 1, sub: 'IN CURRENT VIEW' });
  if (kpis.units && kpis.unitsTotal !== undefined) {
    const perUnit = series.map((s, i) => {
      const r = ratio(kpis.values[i] ?? 0, kpis.units![i] ?? 0);
      return `${s.short} ${r === undefined ? '—' : fmt.value(r)}`;
    });
    const per = series.map((_, i) => ratio(kpis.values[i] ?? 0, kpis.units![i] ?? 0) ?? 0);
    tiles.push({ label: 'Units', value: kpis.unitsTotal, format: (n) => fmt.count(Math.round(n)), accent: 'var(--hud-sun)', fill: 1, sub: 'ALL SERIES' });
    tiles.push({
      label: 'Per unit',
      value: ratio(kpis.total, kpis.unitsTotal),
      format: fmt.value,
      accent: 'var(--hud-hot)',
      fill: Math.max(...per) ? Math.min(...per) / Math.max(...per) : 0,
      sub: perUnit.join(' · '),
    });
  }
  const shown = tiles.slice(0, 4);
  return (
    <div className="grid h-full grid-cols-2 gap-200" style={{ gridAutoRows: '1fr' }}>
      {shown.map((t) => (
        <Readout key={t.label} {...t} />
      ))}
    </div>
  );
}
