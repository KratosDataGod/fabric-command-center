import { motion, useReducedMotion } from 'framer-motion';

import { hasSelection, isAdditive, isSelected, useDashboard } from '@/dashboard/context';
import type { SplitRow } from '@/data/rows';

/** Ranked members of a dimension with stacked series bars. Click to lock on. */
export function TargetList({ rows, dimId }: { rows: SplitRow[]; dimId: string }) {
  const { series, filters, select, fmt } = useDashboard();
  const reduce = useReducedMotion();
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const max = Math.max(1, ...sorted.map((r) => r.total));
  const any = hasSelection(filters, dimId);
  return (
    <ol className="flex h-full flex-col gap-100 overflow-auto">
      {sorted.map((r, i) => {
        const name = String(r.key);
        const isSel = isSelected(filters, dimId, r.key);
        return (
          <motion.li key={name} layout={!reduce} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
            <button
              type="button"
              onClick={(e) => select(dimId, r.key, isAdditive(e))}
              aria-pressed={isSel}
              className="hud-hit grid w-full items-center gap-x-300 px-200 py-100 text-left"
              style={{
                gridTemplateColumns: '28px 1fr auto',
                border: `1px solid ${isSel ? 'var(--hud-hot)' : 'transparent'}`,
                background: isSel ? 'color-mix(in srgb, var(--hud-hot) 14%, transparent)' : 'transparent',
                opacity: any && !isSel ? 0.45 : 1,
              }}
            >
              <span className="hud-mono" style={{ fontSize: 12, color: isSel ? 'var(--hud-hot)' : 'var(--hud-s1)' }}>{String(i + 1).padStart(2, '0')}</span>
              <span className="min-w-0">
                <span className="block truncate" style={{ fontFamily: 'var(--hud-head)', fontWeight: 700, fontSize: 14, letterSpacing: '0.1em' }}>
                  {name.toUpperCase()} {isSel ? <span style={{ color: 'var(--hud-hot)' }}>◄ LOCKED</span> : null}
                </span>
                <span className="mt-100 flex h-[7px]" aria-hidden>
                  {r.values.map((v, k) => (
                    <span key={k} style={{ width: `${(Math.max(0, v) / max) * 100}%`, background: series[k]?.color, boxShadow: `0 0 8px ${series[k]?.color}`, transition: 'width .8s' }} />
                  ))}
                </span>
              </span>
              <span className="hud-mono" style={{ fontSize: 13, fontWeight: 700 }}>{fmt.value(r.total)}</span>
            </button>
          </motion.li>
        );
      })}
    </ol>
  );
}
