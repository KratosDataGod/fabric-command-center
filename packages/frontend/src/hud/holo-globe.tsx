import { useReducedMotion } from 'framer-motion';
import { geoDistance, geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import type { Feature, MultiPolygon } from 'geojson';
import { useEffect, useMemo, useRef, useState } from 'react';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopo from 'world-atlas/land-110m.json';

import { isAdditive, isSelected, useDashboard } from '@/dashboard/context';
import type { SplitRow } from '@/data/rows';
import { locate } from '@/geo/countries';

import { useSize } from './use-size';

const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
const LAND = feature(topo, topo.objects.land) as unknown as Feature<MultiPolygon>;
const GRATICULE = geoGraticule10();

/** Rotating, draggable globe with a pulsing beacon per country. Click to lock on. */
export function HoloGlobe({ rows }: { rows: SplitRow[] }) {
  const { model, filters, select, fmt } = useDashboard();
  const geo = model.dimensions.geo!;
  const selectedList = (filters.geo ?? []).map(String);
  const focus = selectedList[selectedList.length - 1];
  const reduce = useReducedMotion();
  const [boxRef, { width, height }] = useSize<HTMLDivElement>();
  const [rotation, setRotationState] = useState<[number, number]>([40, -20]);
  const rotRef = useRef<[number, number]>([40, -20]);
  const setRotation = (r: [number, number]) => {
    rotRef.current = r;
    setRotationState(r);
  };
  const [isDragging, setIsDragging] = useState(false);
  const target = useRef<[number, number] | null>(null);
  const dragging = useRef<{ x: number; y: number; r: [number, number]; moved: boolean } | null>(null);
  const hovering = useRef(false);

  // Spin to the most recently selected country.
  useEffect(() => {
    const c = focus ? locate(focus, geo.coordinates, geo.aliases) : undefined;
    target.current = c ? [-c[0], -c[1] * 0.6] : null;
  }, [focus, geo.coordinates, geo.aliases]);

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!dragging.current) {
        const [lam, phi] = rotRef.current;
        if (target.current) {
          const [tl, tp] = target.current;
          const dl = ((((tl - lam) % 360) + 540) % 360) - 180;
          const dp = tp - phi;
          if (Math.abs(dl) > 0.05 || Math.abs(dp) > 0.05) {
            const k = reduce ? 1 : Math.min(1, dt / 220);
            setRotation([lam + dl * k, phi + dp * k]);
          }
        } else if (!reduce && !hovering.current) {
          setRotation([lam + dt * 0.012, phi + (-18 - phi) * Math.min(1, dt / 900)]);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reduce]);

  const radius = Math.max(40, Math.min(width, height) / 2 - 26);
  const cx = width / 2;
  const cy = height / 2;
  const { projection, path } = useMemo(() => {
    const p = geoOrthographic().scale(radius).translate([cx, cy]).rotate([rotation[0], rotation[1]]).clipAngle(90);
    return { projection: p, path: geoPath(p) };
  }, [radius, cx, cy, rotation]);

  const max = Math.max(1, ...rows.map((r) => r.total));
  const center: [number, number] = [-rotation[0], -rotation[1]];
  const beacons = rows
    .map((r) => {
      const name = String(r.key);
      const coord = locate(name, geo.coordinates, geo.aliases);
      if (!coord) return null;
      const xy = projection(coord);
      if (!xy) return null;
      return { row: r, name, x: xy[0], y: xy[1], visible: geoDistance(coord, center) < Math.PI / 2 - 0.08, size: 5 + 15 * Math.sqrt(Math.max(0, r.total) / max) };
    })
    .filter((b): b is NonNullable<typeof b> => b !== null);
  const placed = new Set(beacons.map((b) => b.name));
  const unplaced = rows.filter((r) => !placed.has(String(r.key)));
  const anySelected = selectedList.length > 0;

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragging.current = { x: e.clientX, y: e.clientY, r: rotRef.current, moved: false };
    target.current = null;
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d) return;
    d.moved = true;
    const k = 90 / radius;
    setRotation([d.r[0] + (e.clientX - d.x) * k, Math.max(-60, Math.min(60, d.r[1] - (e.clientY - d.y) * k))]);
  };
  const endDrag = () => {
    dragging.current = null;
    setIsDragging(false);
  };

  // Biggest and selected beacons get labels first; a label that would overlap one already placed is dropped
  // (hover, focus and the target list still name every country).
  const visible = beacons.filter((b) => b.visible).sort((a, b) => a.size - b.size);
  const labeled = new Set<string>();
  const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [];
  for (const b of [...visible].sort((a, c) => Number(isSelected(filters, 'geo', c.row.key)) - Number(isSelected(filters, 'geo', a.row.key)) || c.size - a.size)) {
    const w = Math.max(b.name.length * 9.5, 70) + 8;
    const lx = b.x + (b.x > cx ? 26 : -26);
    const box = b.x > cx ? { x0: lx, x1: lx + w, y0: b.y - 38, y1: b.y } : { x0: lx - w, x1: lx, y0: b.y - 38, y1: b.y };
    if (boxes.some((o) => box.x0 < o.x1 && box.x1 > o.x0 && box.y0 < o.y1 && box.y1 > o.y0)) continue;
    boxes.push(box);
    labeled.add(b.name);
  }

  return (
    <div
      ref={boxRef}
      className="absolute inset-0 touch-none select-none"
      onPointerEnter={() => (hovering.current = true)}
      onPointerLeave={() => {
        hovering.current = false;
        endDrag();
      }}
    >
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label={`Globe of ${model.dimensions.geo?.label ?? 'country'} totals`} style={{ cursor: isDragging ? 'grabbing' : 'grab' }}>
          <defs>
            <radialGradient id="globe-fill" cx="40%" cy="35%" r="75%">
              <stop offset="0%" stopColor="var(--hud-s1)" stopOpacity="0.22" />
              <stop offset="60%" stopColor="var(--hud-s0)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--hud-bg)" stopOpacity="0.9" />
            </radialGradient>
            <radialGradient id="globe-atmo" cx="50%" cy="50%" r="50%">
              <stop offset="82%" stopColor="var(--hud-s1)" stopOpacity="0" />
              <stop offset="92%" stopColor="var(--hud-s1)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--hud-s1)" stopOpacity="0" />
            </radialGradient>
            <pattern id="globe-halftone" width="5" height="5" patternUnits="userSpaceOnUse">
              <circle cx="2.5" cy="2.5" r="1.25" fill="var(--hud-s1)" />
            </pattern>
            <filter id="globe-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle cx={cx} cy={cy} r={radius * 1.12} fill="url(#globe-atmo)" />
          <g onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag}>
            <circle cx={cx} cy={cy} r={radius} fill="url(#globe-fill)" stroke="var(--hud-line)" strokeWidth={1.2} />
            <path d={path(GRATICULE) ?? ''} fill="none" stroke="var(--hud-line-soft)" strokeWidth={0.7} />
            <path d={path(LAND) ?? ''} fill="url(#globe-halftone)" stroke="var(--hud-s1)" strokeOpacity={0.7} strokeWidth={0.8} />
          </g>
          <g opacity={0.7} pointerEvents="none">
            <ellipse className="hud-spin" cx={cx} cy={cy} rx={radius * 1.22} ry={radius * 1.22} fill="none" stroke="var(--hud-line-soft)" strokeDasharray="2 10" />
            <ellipse className="hud-spin-rev" cx={cx} cy={cy} rx={radius * 1.3} ry={radius * 1.3} fill="none" stroke="var(--hud-s0)" strokeOpacity={0.4} strokeDasharray="60 30 4 30" />
          </g>
          {visible.map((b) => {
              const isSel = isSelected(filters, 'geo', b.row.key);
              const dim = anySelected && !isSel;
              const lx = b.x + (b.x > cx ? 26 : -26);
              const anchor = b.x > cx ? 'start' : 'end';
              const fire = (additive: boolean) => select('geo', b.row.key, additive);
              return (
                <g key={b.name} className="hud-hit" role="button" tabIndex={0} aria-pressed={isSel}
                  aria-label={`${b.name}: ${fmt.value(b.row.total)}. Click to filter, Ctrl+click to add.`}
                  onClick={(e) => fire(isAdditive(e))}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fire(isAdditive(e)))}
                  opacity={dim ? 0.35 : 1}>
                  <circle cx={b.x} cy={b.y} r={Math.max(16, b.size + 6)} fill="transparent" />
                  <circle className="hud-pulse" cx={b.x} cy={b.y} r={b.size} fill="none" stroke={isSel ? 'var(--hud-hot)' : 'var(--hud-s1)'} strokeWidth={2} />
                  <circle cx={b.x} cy={b.y} r={b.size * 0.55} fill={isSel ? 'var(--hud-hot)' : 'var(--hud-s1)'} filter="url(#globe-glow)" />
                  <circle cx={b.x} cy={b.y} r={2.2} fill="var(--hud-ink)" />
                  {labeled.has(b.name) ? (
                    <>
                      <line x1={b.x} y1={b.y} x2={lx} y2={b.y - 18} stroke="var(--hud-line)" />
                      <line x1={lx} y1={b.y - 18} x2={lx + (anchor === 'start' ? 70 : -70)} y2={b.y - 18} stroke="var(--hud-line)" />
                      <text x={lx} y={b.y - 23} textAnchor={anchor} fill="var(--hud-ink)" style={{ fontFamily: 'var(--hud-head)', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em' }}>
                        {b.name.toUpperCase()}
                      </text>
                      <text x={lx} y={b.y - 6} textAnchor={anchor} fill={isSel ? 'var(--hud-hot)' : 'var(--hud-s1)'} style={{ fontFamily: 'var(--hud-mono)', fontSize: 11 }}>
                        {fmt.value(b.row.total)}
                      </text>
                    </>
                  ) : null}
                  {isSel ? (
                    <rect pointerEvents="none" x={b.x - b.size - 9} y={b.y - b.size - 9} width={(b.size + 9) * 2} height={(b.size + 9) * 2}
                      fill="none" stroke="var(--hud-hot)" strokeWidth={2} strokeDasharray="8 6" className="hud-spin-fast" />
                  ) : null}
                </g>
              );
            })}
          <g pointerEvents="none" stroke="var(--hud-line)" strokeWidth={1} fill="none" opacity={0.8}>
            <path d={`M${cx - radius - 18},${cy} h12 M${cx + radius + 6},${cy} h12 M${cx},${cy - radius - 18} v12 M${cx},${cy + radius + 6} v12`} />
          </g>
          <text x={12} y={height - 12} fill="var(--hud-dim)" style={{ fontFamily: 'var(--hud-mono)', fontSize: 11, letterSpacing: '0.12em' }}>
            LON {(-rotation[0]).toFixed(1)}° · LAT {(-rotation[1]).toFixed(1)}° · DRAG TO ROTATE
            {unplaced.length ? ` · ${unplaced.length} NOT ON MAP` : ''}
          </text>
        </svg>
      ) : null}
      <ul className="sr-only">
        {beacons.filter((b) => !b.visible).map((b) => b.row).concat(unplaced).map((r) => (
          <li key={String(r.key)}>
            <button type="button" onClick={(e) => select('geo', r.key, isAdditive(e))}>
              {String(r.key)}: {fmt.value(r.total)}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
