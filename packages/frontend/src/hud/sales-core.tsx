import { useDashboard } from '@/dashboard/context';
import type { Kpis } from '@/data/rows';

import { CountUp } from './count-up';
import { useSize } from './use-size';

/** Concentric spinning rings: each series' share of the total around a count-up total. */
export function SalesCore({ kpis }: { kpis: Kpis }) {
  const { series, fmt } = useDashboard();
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const size = Math.max(120, Math.min(width, height));
  const c = size / 2;
  const rArc = size * 0.36;
  const circ = 2 * Math.PI * rArc;
  const shares = kpis.values.map((v) => (kpis.total ? v / kpis.total : 0));
  const gap = kpis.total && series.length > 1 ? 6 : 0;
  const arcs = shares.map((s, i) => ({
    len: Math.max(0, s * circ - gap),
    offset: shares.slice(0, i).reduce((a, b) => a + b, 0) * circ,
    color: series[i]?.color ?? 'var(--hud-s0)',
  }));
  const ticks = Array.from({ length: 72 }, (_, i) => i);
  const ease = 'cubic-bezier(.16,1,.3,1)';

  return (
    <div ref={ref} className="absolute inset-0 grid place-items-center">
      {width > 0 ? (
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} aria-hidden>
            <defs>
              <filter id="core-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="core-heart">
                <stop offset="0%" stopColor="var(--hud-s1)" stopOpacity="0.28" />
                <stop offset="70%" stopColor="var(--hud-s0)" stopOpacity="0.06" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx={c} cy={c} r={size * 0.3} fill="url(#core-heart)" />
            <g className="hud-spin">
              {ticks.map((i) => {
                const a = (i / ticks.length) * Math.PI * 2;
                const long = i % 6 === 0;
                const r1 = size * 0.47;
                const r2 = r1 - (long ? size * 0.04 : size * 0.018);
                return (
                  <line key={i} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}
                    stroke={long ? 'var(--hud-s1)' : 'var(--hud-line)'} strokeWidth={long ? 2 : 1} />
                );
              })}
            </g>
            <circle className="hud-spin-rev" cx={c} cy={c} r={size * 0.415} fill="none" stroke="var(--hud-s0)" strokeOpacity={0.6} strokeWidth={1.5} strokeDasharray="3 7 40 7" />
            <g transform={`rotate(-90 ${c} ${c})`} filter="url(#core-glow)">
              <circle cx={c} cy={c} r={rArc} fill="none" stroke="var(--hud-line-soft)" strokeWidth={size * 0.055} />
              {arcs.map((a, i) => (
                <circle key={i} cx={c} cy={c} r={rArc} fill="none" stroke={a.color} strokeWidth={size * 0.055}
                  strokeDasharray={`${a.len} ${circ}`} strokeDashoffset={-a.offset}
                  style={{ transition: `stroke-dasharray 1s ${ease}, stroke-dashoffset 1s ${ease}` }} />
              ))}
            </g>
            <circle className="hud-spin-fast" cx={c} cy={c} r={size * 0.29} fill="none" stroke="var(--hud-hot)" strokeOpacity={0.55} strokeWidth={1} strokeDasharray="1 5" />
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <div className="hud-label">Total</div>
              <CountUp value={kpis.total} format={fmt.value} className="hud-split block" />
              {series.length > 1 ? (
                <div className="hud-mono mt-100 flex flex-wrap justify-center gap-x-300" style={{ fontSize: 12, maxWidth: size * 0.62 }}>
                  {series.map((s, i) => (
                    <span key={s.label} style={{ color: s.color }}>■ {fmt.pct(shares[i] ?? 0)} {s.short}</span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <style>{`.hud-area-core .hud-split{font-size:${Math.round(size * 0.13)}px;line-height:1.05}`}</style>
        </div>
      ) : null}
    </div>
  );
}
