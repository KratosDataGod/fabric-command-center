import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import type { ValueFormat } from '@/config';
import { isAdditive, isSelected, useDashboard } from '@/dashboard/context';
import { builderQuery, totalExpression } from '@/dax/builder';
import { num } from '@/data/rows';
import { useRows } from '@/data/use-rows';
import { HudPanel } from '@/hud/panel';
import { panelState } from '@/hud/panel-state';
import { useSize } from '@/hud/use-size';

import { PanelActions } from './panel-actions';

type ChartKind = 'bar' | 'column' | 'line' | 'table';

export interface BuiltVisual {
  id: string;
  title: string;
  measure: string;
  dimension: string;
  chart: ChartKind;
  topN: number;
}

interface MeasureOption {
  id: string;
  label: string;
  expression: string;
  format?: ValueFormat;
}

function useMeasureOptions(): MeasureOption[] {
  const { model } = useDashboard();
  return useMemo(
    () => [
      ...(model.series.length > 1 ? [{ id: '__total', label: 'Total', expression: totalExpression(model) }] : []),
      ...model.series.map((s) => ({ id: `series:${s.id}`, label: s.label, expression: s.value })),
      ...(model.extraMeasures ?? []).map((m) => ({ id: `measure:${m.id}`, label: m.label, expression: m.expression, format: m.format })),
    ],
    [model]
  );
}

const storageKey = (scope: string) => `fcc.workbench.v1.${scope}`;

function loadVisuals(scope: string): BuiltVisual[] {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey(scope)) ?? '[]') as unknown;
    return Array.isArray(raw) ? (raw as BuiltVisual[]).filter((v) => v && typeof v.id === 'string') : [];
  } catch {
    return [];
  }
}

function saveVisuals(scope: string, v: BuiltVisual[]) {
  try {
    localStorage.setItem(storageKey(scope), JSON.stringify(v.slice(0, 24)));
  } catch {
    // Storage blocked: visuals last for this session only.
  }
}

function Chart({ rows, kind, dimId, format }: { rows: { key: string | number; value: number }[]; kind: ChartKind; dimId: string; format: (n: number) => string }) {
  const { filters, select } = useDashboard();
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.value)));
  const any = (filters[dimId]?.length ?? 0) > 0;
  const pick = (key: string | number, e: { ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }) => select(dimId, key, isAdditive(e));

  if (kind === 'table') {
    return (
      <div className="hud-table-wrap absolute inset-0">
        <table className="hud-table">
          <tbody>
            {rows.map((r) => (
              <tr key={String(r.key)} className="hud-hit" onClick={(e) => pick(r.key, e)} style={{ opacity: any && !isSelected(filters, dimId, r.key) ? 0.45 : 1 }}>
                <td>{String(r.key)}</td>
                <td className="num">{format(r.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <div ref={ref} className="absolute inset-0">
      {width > 0 ? (
        <svg width={width} height={height} role="img" aria-label="Custom visual">
          {kind === 'bar'
            ? rows.map((r, i) => {
                const rowH = Math.max(0, Math.min(28, (height - 4) / Math.max(1, rows.length)));
                const label = 110;
                const w = Math.max(1, ((width - label - 70) * Math.abs(r.value)) / max);
                const y = 2 + i * rowH;
                const on = isSelected(filters, dimId, r.key);
                return (
                  <g key={String(r.key)} className="hud-hit" role="button" tabIndex={0} aria-label={`${r.key}: ${format(r.value)}`} onClick={(e) => pick(r.key, e)} opacity={any && !on ? 0.35 : 1}>
                    <rect x={0} y={y} width={width} height={rowH} fill="transparent" />
                    <text x={label - 8} y={y + rowH * 0.66} textAnchor="end" fill="var(--hud-ink)" style={{ fontFamily: 'var(--hud-head)', fontSize: 12 }}>{String(r.key).slice(0, 16)}</text>
                    <rect x={label} y={y + rowH * 0.18} width={w} height={rowH * 0.64} fill={on ? 'var(--hud-hot)' : 'var(--hud-s1)'} style={{ filter: 'drop-shadow(0 0 4px var(--hud-s1))' }} />
                    <text x={label + w + 6} y={y + rowH * 0.66} fill="var(--hud-dim)" style={{ fontFamily: 'var(--hud-mono)', fontSize: 11 }}>{format(r.value)}</text>
                  </g>
                );
              })
            : null}
          {kind === 'column' || kind === 'line'
            ? (() => {
                const pad = { l: 10, r: 10, t: 16, b: 24 };
                const w = Math.max(0, width - pad.l - pad.r);
                const h = Math.max(0, height - pad.t - pad.b);
                const step = w / Math.max(1, rows.length);
                const pts = rows.map((r, i) => [pad.l + step * (i + 0.5), pad.t + h - (h * Math.max(0, r.value)) / max] as const);
                return (
                  <g>
                    {kind === 'line' ? (
                      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="var(--hud-s1)" strokeWidth={2.5} style={{ filter: 'drop-shadow(0 0 4px var(--hud-s1))' }} />
                    ) : null}
                    {rows.map((r, i) => {
                      const on = isSelected(filters, dimId, r.key);
                      const [px, py] = pts[i]!;
                      return (
                        <g key={String(r.key)} className="hud-hit" role="button" tabIndex={0} aria-label={`${r.key}: ${format(r.value)}`} onClick={(e) => pick(r.key, e)} opacity={any && !on ? 0.35 : 1}>
                          <rect x={pad.l + step * i} y={pad.t} width={step} height={h + pad.b} fill="transparent" />
                          {kind === 'column' ? (
                            <rect x={px - step * 0.32} y={py} width={step * 0.64} height={pad.t + h - py} fill={on ? 'var(--hud-hot)' : 'var(--hud-s0)'} />
                          ) : (
                            <circle cx={px} cy={py} r={4} fill={on ? 'var(--hud-hot)' : 'var(--hud-s1)'} />
                          )}
                          {rows.length <= 16 ? (
                            <text x={px} y={height - 8} textAnchor="middle" fill="var(--hud-dim)" style={{ fontFamily: 'var(--hud-mono)', fontSize: 10 }}>{String(r.key).slice(0, 10)}</text>
                          ) : null}
                        </g>
                      );
                    })}
                  </g>
                );
              })()
            : null}
        </svg>
      ) : null}
    </div>
  );
}

function BuiltPanel({ visual, index, onRemove }: { visual: BuiltVisual; index: number; onRemove: () => void }) {
  const { model, dims, filters, fmt, openDetail } = useDashboard();
  const measures = useMeasureOptions();
  const measure = measures.find((m) => m.id === visual.measure);
  const dim = dims.find((d) => d.id === visual.dimension);
  const query = useMemo(() => (measure && dim ? builderQuery(dim, measure.expression, filters, dims, visual.topN) : undefined), [measure, dim, filters, dims, visual.topN]);
  const res = useRows(model.connector, query);
  const ref = useRef<HTMLElement>(null);
  const format = (n: number) => fmt.as(n, measure?.format);
  const rows = (res.data ?? []).map((r) => ({ key: r[0] as string | number, value: num(r[1]) }));
  const data = res.data
    ? { title: visual.title, header: [dim?.label ?? '', measure?.label ?? ''], rows: rows.map((r) => [r.key, r.value]), summary: `${visual.title}: ${rows.slice(0, 5).map((r) => `${r.key} ${format(r.value)}`).join(', ')}` }
    : undefined;
  return (
    <HudPanel ref={ref} code={`W${String(index + 1).padStart(2, '0')}`} title={visual.title} hint={`${measure?.label ?? '?'} by ${dim?.label ?? '?'}`} className="hud-wb-visual"
      actions={
        <>
          <PanelActions data={data} target={ref} onDetail={openDetail} />
          <button type="button" className="hud-icon-btn" aria-label={`Remove ${visual.title}`} onClick={onRemove}>
            <Trash2 className="icon-size-200" aria-hidden />
          </button>
        </>
      }>
      {!measure || !dim ? (
        <p className="hud-hint">This visual uses a measure or dimension that is no longer in the model. Remove it and build a new one.</p>
      ) : (
        panelState(res, Boolean(res.data), rows.length === 0) ?? <Chart rows={rows} kind={visual.chart} dimId={dim.id} format={format} />
      )}
    </HudPanel>
  );
}

/** "Quickly create and personalize visuals": viewers build their own panels from the model's measures and dimensions. */
export function Workbench({ scope }: { scope: string }) {
  const { dims } = useDashboard();
  const measures = useMeasureOptions();
  const [visuals, setVisuals] = useState<BuiltVisual[]>(() => loadVisuals(scope));
  const [draft, setDraft] = useState({ measure: measures[0]?.id ?? '', dimension: dims[1]?.id ?? dims[0]?.id ?? '', chart: 'bar' as ChartKind, topN: 10, title: '' });
  const update = (next: BuiltVisual[]) => {
    setVisuals(next);
    saveVisuals(scope, next);
  };
  const add = () => {
    const m = measures.find((x) => x.id === draft.measure);
    const d = dims.find((x) => x.id === draft.dimension);
    if (!m || !d) return;
    const title = draft.title.trim() || `${m.label} by ${d.label}`;
    update([...visuals, { id: `w${Date.now().toString(36)}`, title, measure: m.id, dimension: d.id, chart: draft.chart, topN: draft.topN }]);
    setDraft((x) => ({ ...x, title: '' }));
  };

  return (
    <div className="hud-workbench">
      <section className="hud-panel hud-builder" aria-label="Visual builder">
        <span className="hud-halftone" aria-hidden />
        <header className="hud-panel-head">
          <div className="flex items-baseline gap-300">
            <span className="hud-code">+</span>
            <h2 className="hud-title">Build a visual</h2>
          </div>
          <span className="hud-hint">Saved in this browser</span>
        </header>
        <div className="hud-builder-form">
          <label>
            <span className="hud-label">Measure</span>
            <select className="hud-input" value={draft.measure} onChange={(e) => setDraft({ ...draft, measure: e.target.value })}>
              {measures.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label>
            <span className="hud-label">By</span>
            <select className="hud-input" value={draft.dimension} onChange={(e) => setDraft({ ...draft, dimension: e.target.value })}>
              {dims.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label>
            <span className="hud-label">Chart</span>
            <select className="hud-input" value={draft.chart} onChange={(e) => setDraft({ ...draft, chart: e.target.value as ChartKind })}>
              <option value="bar">Bars</option>
              <option value="column">Columns</option>
              <option value="line">Line</option>
              <option value="table">Table</option>
            </select>
          </label>
          <label>
            <span className="hud-label">Top</span>
            <input className="hud-input" type="number" min={1} max={100} value={draft.topN} onChange={(e) => setDraft({ ...draft, topN: Math.min(100, Math.max(1, Number(e.target.value) || 10)) })} />
          </label>
          <label className="hud-builder-title">
            <span className="hud-label">Title (optional)</span>
            <input className="hud-input" value={draft.title} maxLength={60} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </label>
          <button type="button" className="hud-btn self-end" onClick={add}>
            <Plus className="icon-size-200" aria-hidden /> Add visual
          </button>
        </div>
      </section>
      {visuals.length === 0 ? <p className="hud-hint p-300">No custom visuals yet. Pick a measure and a dimension above.</p> : null}
      <div className="hud-workbench-grid">
        {visuals.map((v, i) => (
          <BuiltPanel key={v.id} visual={v} index={i} onRemove={() => update(visuals.filter((x) => x.id !== v.id))} />
        ))}
      </div>
    </div>
  );
}
