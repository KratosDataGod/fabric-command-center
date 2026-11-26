import { hierarchy, pack } from 'd3-hierarchy';
import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

import { hasSelection, isAdditive, isSelected, useDashboard } from '@/dashboard/context';
import type { SplitRow } from '@/data/rows';

import { useSize } from './use-size';

/** Swatches for colour-named members; anything else gets a stable generated hue. */
const SWATCH: Record<string, { fill: string; ink: string }> = {
  black: { fill: '#1d1b26', ink: '#f4f4f8' },
  silver: { fill: '#c5ccd8', ink: '#14121c' },
  grey: { fill: '#8a8f99', ink: '#14121c' },
  gray: { fill: '#8a8f99', ink: '#14121c' },
  red: { fill: '#ff3b5c', ink: '#14121c' },
  yellow: { fill: '#ffd23f', ink: '#14121c' },
  blue: { fill: '#3d7bff', ink: '#ffffff' },
  white: { fill: '#f6f6f6', ink: '#14121c' },
  green: { fill: '#2ecc71', ink: '#14121c' },
  orange: { fill: '#ff8c1a', ink: '#14121c' },
  purple: { fill: '#8e5cff', ink: '#ffffff' },
  pink: { fill: '#ff7eb6', ink: '#14121c' },
  brown: { fill: '#8b5a2b', ink: '#ffffff' },
};

function hashHue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

const safeId = (name: string) => name.replace(/\W/g, '') || 'x';

function swatch(name: string, colorNames: boolean, index: number): { fill: string; ink: string } {
  if (colorNames) {
    const key = name.toLowerCase();
    if (SWATCH[key]) return SWATCH[key];
    if (key === 'multi') return { fill: 'url(#cb-multi)', ink: '#14121c' };
    if (name.includes('/')) return { fill: `url(#cb-split-${safeId(name)})`, ink: '#14121c' };
    if (key === 'na' || key === 'n/a') return { fill: 'url(#cb-hatch)', ink: 'var(--hud-ink)' };
  }
  const hue = colorNames ? hashHue(name) : (hashHue(name) + index * 47) % 360;
  return { fill: `hsl(${hue} 80% 60%)`, ink: '#14121c' };
}

/** Packed bubbles per category member. The outer ring shows the first series' share. */
export function ColorBubbles({ rows }: { rows: SplitRow[] }) {
  const { model, series, filters, select, fmt } = useDashboard();
  const colorNames = Boolean(model.dimensions.category?.colorNames);
  const reduce = useReducedMotion();
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const nodes = useMemo(() => {
    if (!width || !height) return [];
    const positive = rows.filter((r) => r.total > 0).slice(0, 60);
    const root = hierarchy<{ children?: SplitRow[] }>({ children: positive }).sum((d) => (d as unknown as SplitRow).total ?? 0);
    return pack<{ children?: SplitRow[] }>().size([width, height]).padding(6)(root).leaves();
  }, [rows, width, height]);
  const splits = colorNames ? rows.map((r) => String(r.key)).filter((n) => n.includes('/')) : [];
  const any = hasSelection(filters, 'category');

  return (
    <div ref={ref} className="absolute inset-0">
      {width > 0 ? (
        <svg width={width} height={height} role="group" aria-label={`${model.dimensions.category?.label ?? 'Category'} bubbles`}>
          <defs>
            <pattern id="cb-dots" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="3" cy="3" r="1.3" fill="#000" fillOpacity="0.28" />
            </pattern>
            <pattern id="cb-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#5d6070" />
              <line x1="0" y1="0" x2="0" y2="8" stroke="#9aa0ae" strokeWidth="3" />
            </pattern>
            <linearGradient id="cb-multi" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stopColor="#ff3b5c" /><stop offset="0.33" stopColor="#ffd23f" />
              <stop offset="0.66" stopColor="#2ee6ff" /><stop offset="1" stopColor="#a07bff" />
            </linearGradient>
            {splits.map((n) => {
              const [a, b] = n.split('/');
              return (
                <linearGradient key={n} id={`cb-split-${safeId(n)}`} x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0.5" stopColor={swatch(a ?? '', true, 0).fill} /><stop offset="0.5" stopColor={swatch(b ?? '', true, 0).fill} />
                </linearGradient>
              );
            })}
          </defs>
          {nodes.map((n, i) => {
            const row = n.data as unknown as SplitRow;
            const name = String(row.key);
            const sw = swatch(name, colorNames, i);
            const isSel = isSelected(filters, 'category', row.key);
            const firstShare = row.total ? Math.max(0, row.values[0] ?? 0) / row.total : 0;
            const fire = (additive: boolean) => select('category', row.key, additive);
            return (
              <motion.g key={name} className="hud-hit" role="button" tabIndex={0} aria-pressed={isSel}
                aria-label={`${name}: ${fmt.value(row.total)}. Click to filter, Ctrl+click to add.`}
                onClick={(e) => fire(isAdditive(e))}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fire(isAdditive(e)))}
                initial={reduce ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: any && !isSel ? 0.3 : 1, x: n.x, y: n.y }}
                transition={{ type: 'spring', stiffness: 160, damping: 18, delay: reduce ? 0 : i * 0.03 }}
                whileHover={reduce ? undefined : { scale: 1.06 }}>
                <circle r={n.r} fill="#14121c" transform="translate(3 3)" opacity={0.5} />
                <circle r={n.r} fill={sw.fill} stroke={isSel ? 'var(--hud-hot)' : 'var(--hud-line)'} strokeWidth={isSel ? 4 : 1.5} />
                <circle r={n.r} fill="url(#cb-dots)" />
                {series.length > 1 ? (
                  <circle r={n.r + 4} fill="none" stroke={series[0]?.color} strokeWidth={3}
                    strokeDasharray={`${firstShare * 2 * Math.PI * (n.r + 4)} 9999`} transform="rotate(-90)" />
                ) : null}
                {n.r > 22 ? (
                  <g pointerEvents="none" textAnchor="middle">
                    <text y={-2} fill={sw.ink} style={{ fontFamily: 'var(--hud-comic)', fontSize: Math.min(26, n.r / 2.4), letterSpacing: '0.05em' }}>{name.toUpperCase()}</text>
                    <text y={Math.min(26, n.r / 2.4) * 0.75} fill={sw.ink} style={{ fontFamily: 'var(--hud-mono)', fontSize: Math.max(10, Math.min(13, n.r / 4)), fontWeight: 700 }}>{fmt.value(row.total)}</text>
                  </g>
                ) : null}
              </motion.g>
            );
          })}
        </svg>
      ) : null}
    </div>
  );
}
