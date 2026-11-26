import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';

import { hasSelection, isAdditive, isSelected, useDashboard } from '@/dashboard/context';
import type { SplitRow } from '@/data/rows';

import { useSize } from './use-size';

type Pt = [number, number];

/** Smooth path through points (Catmull-Rom → cubic Bézier). */
function smooth(points: Pt[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0]![0]},${points[0]![1]}`;
  let d = `M${points[0]![0]},${points[0]![1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const t = 0.18;
    d += ` C${p1[0] + (p2[0] - p0[0]) * t},${p1[1] + (p2[1] - p0[1]) * t} ${p2[0] - (p3[0] - p1[0]) * t},${p2[1] - (p3[1] - p1[1]) * t} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

/** Glowing line per series that draws itself in, with a scan cursor. Click a period to lock on. */
export function Trend({ rows }: { rows: SplitRow[] }) {
  const { series: meta, filters, select, fmt } = useDashboard();
  const money = { format: fmt.value };
  const moneyFull = { format: fmt.full };
  const isSel = (k: string | number) => isSelected(filters, 'time', k);
  const any = hasSelection(filters, 'time');
  const reduce = useReducedMotion();
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const m = { l: 56, r: 18, t: 14, b: 28 };
  const w = Math.max(0, width - m.l - m.r);
  const h = Math.max(0, height - m.t - m.b);
  const yMax = niceMax(Math.max(0, ...rows.flatMap((r) => r.values)) * 1.08);
  const step = rows.length > 1 ? w / (rows.length - 1) : 0;
  const x = (i: number) => m.l + (rows.length > 1 ? i * step : w / 2);
  const y = (v: number) => m.t + h - (v / yMax) * h;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * yMax);

  const series = meta.map((m, idx) => ({ key: idx, color: m.color, label: m.short }));
  const dataKey = rows.map((r) => `${r.key}:${Math.round(r.total)}`).join('|');
  const lastSel = (filters.time ?? [])[(filters.time?.length ?? 0) - 1];
  const active = hover ?? (lastSel !== undefined ? rows.findIndex((r) => r.key === lastSel) : -1);
  const activeRow = active >= 0 ? rows[active] : undefined;

  return (
    <div ref={ref} className="absolute inset-0">
      {width > 0 && rows.length > 0 ? (
        <svg width={width} height={height} role="group" aria-label="Trend by period">
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`yl-fill-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
            <filter id="yl-glow" x="-10%" y="-30%" width="120%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {ticks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={m.l + w} y1={y(t)} y2={y(t)} stroke="var(--hud-line-soft)" strokeDasharray={t === 0 ? undefined : '2 6'} />
              <text x={m.l - 10} y={y(t) + 4} textAnchor="end" fill="var(--hud-dim)" style={{ fontFamily: 'var(--hud-mono)', fontSize: 11 }}>
                {money.format(t)}
              </text>
            </g>
          ))}

          {series.map((s) => {
            const pts: Pt[] = rows.map((r, i) => [x(i), y(r.values[s.key] ?? 0)]);
            const line = smooth(pts);
            const area = `${line} L${x(rows.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
            return (
              <g key={`${s.key}-${dataKey}`}>
                <motion.path d={area} fill={`url(#yl-fill-${s.key})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.4 }} />
                <motion.path d={line} fill="none" stroke={s.color} strokeWidth={2.8} filter="url(#yl-glow)" strokeLinecap="round"
                  initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
                {pts.map(([px, py], i) => (
                  <rect key={i} x={px - 5} y={py - 5} width={10} height={10} transform={`rotate(45 ${px} ${py})`}
                    fill={i === active ? s.color : 'var(--hud-bg)'} stroke={s.color} strokeWidth={2} />
                ))}
              </g>
            );
          })}

          {/* x labels */}
          {rows.map((r, i) => (
            <text key={String(r.key)} x={x(i)} y={m.t + h + 20} textAnchor="middle"
              fill={isSel(r.key) ? 'var(--hud-hot)' : any ? 'var(--hud-dim)' : 'var(--hud-ink)'}
              style={{ fontFamily: 'var(--hud-head)', fontWeight: 700, fontSize: 13, letterSpacing: '0.1em' }}>
              {r.key}
            </text>
          ))}

          {/* scan beam + readout */}
          {activeRow ? (() => {
            const ax = x(active);
            const locked = isSel(activeRow.key);
            const boxW = 190;
            const bx = ax + 14 + boxW > m.l + w ? ax - 14 - boxW : ax + 14;
            return (
              <g pointerEvents="none">
                <line x1={ax} x2={ax} y1={m.t} y2={m.t + h} stroke={locked ? 'var(--hud-hot)' : 'var(--hud-ink)'} strokeOpacity={0.8} strokeWidth={locked ? 2 : 1} strokeDasharray={locked ? undefined : '3 4'} />
                <rect x={bx} y={m.t + 4} width={boxW} height={30 + series.length * 17} fill="var(--hud-panel)" stroke={locked ? 'var(--hud-hot)' : 'var(--hud-line)'} />
                <text x={bx + 10} y={m.t + 22} fill="var(--hud-ink)" style={{ fontFamily: 'var(--hud-head)', fontWeight: 700, fontSize: 13, letterSpacing: '0.12em' }}>
                  {locked ? `LOCKED · ${activeRow.key}` : String(activeRow.key)}
                </text>
                {series.map((s, k) => (
                  <text key={s.label} x={bx + 10} y={m.t + 41 + k * 17} fill={s.color} style={{ fontFamily: 'var(--hud-mono)', fontSize: 12 }}>
                    {s.label.padEnd(7, ' ')} {moneyFull.format(activeRow.values[k] ?? 0)}
                  </text>
                ))}
              </g>
            );
          })() : null}

          {/* click columns */}
          {rows.map((r, i) => (
            <rect key={`hit-${r.key}`} className="hud-hit" x={x(i) - Math.max(18, step / 2)} y={m.t} width={Math.max(36, step)} height={h + 24}
              fill="transparent" role="button" tabIndex={0} aria-pressed={isSel(r.key)}
              aria-label={`${r.key}: ${money.format(r.total)}. Click to filter, Ctrl+click to add.`}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)} onBlur={() => setHover(null)}
              onClick={(e) => select('time', r.key, isAdditive(e))}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select('time', r.key, isAdditive(e)))} />
          ))}
        </svg>
      ) : null}
    </div>
  );
}
