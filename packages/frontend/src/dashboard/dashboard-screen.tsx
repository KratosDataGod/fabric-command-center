import { Bookmark, Filter, LayoutGrid, Radar, Table2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { brand, features, isFeatureOn, isModuleOn, type ModelConfig } from '@/config';
import { breakdownQuery, kpiQuery } from '@/dax/builder';
import { formattersFor } from '@/data/format';
import { type Kpis, type SplitRow, toKpis, toSplitRows } from '@/data/rows';
import { useRows } from '@/data/use-rows';
import { DetailDrawer } from '@/features/detail-drawer';
import { FiltersPane } from '@/features/filters-pane';
import { PanelActions, type PanelData } from '@/features/panel-actions';
import { ViewsMenu } from '@/features/views-menu';
import { Workbench } from '@/features/workbench';
import { ColorBubbles } from '@/hud/color-bubbles';
import { HoloGlobe } from '@/hud/holo-globe';
import { InsightFeed } from '@/hud/insight-feed';
import { buildInsights } from '@/hud/insights';
import { LockBurst } from '@/hud/lock-burst';
import { HudPanel } from '@/hud/panel';
import { panelState } from '@/hud/panel-state';
import { Readouts } from '@/hud/readouts';
import { SalesCore } from '@/hud/sales-core';
import { TargetList } from '@/hud/target-list';
import { Trend } from '@/hud/trend';
import { activeKeys, clearKey, dimensionsOf, type Dimension, type Filters, toggleValue } from '@/state/filters';

import { DashboardContext, type DashboardContextValue, type SeriesMeta } from './context';

export interface DashboardScreenProps {
  model: ModelConfig;
  profileId: string;
  itemId: string;
  title: string;
  mode: 'hud' | 'workbench';
  filters: Filters;
  onFilters: (filters: Filters) => void;
  onMode: (mode: 'hud' | 'workbench') => void;
  onOpenElsewhere: (profileId: string, itemId: string, filters: Filters) => void;
  dimsFor: (profileId: string, itemId: string) => Dimension[] | undefined;
  deepLinks: boolean;
}

type Drawer = 'filters' | 'detail' | 'views' | null;

function Panel(props: { code: string; title: string; hint?: ReactNode; className: string; data?: PanelData; onDetail?: () => void; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);
  return (
    <HudPanel ref={ref} code={props.code} title={props.title} hint={props.hint} className={props.className}
      actions={<PanelActions data={props.data} target={ref} onDetail={props.onDetail} />}>
      {props.children}
    </HudPanel>
  );
}

const splitData = (title: string, dimLabel: string, series: SeriesMeta[], rows: SplitRow[] | undefined, fmt: (n: number) => string): PanelData | undefined =>
  rows && {
    title,
    header: [dimLabel, ...series.map((s) => s.label), 'Total'],
    rows: rows.map((r) => [r.key, ...r.values, r.total]),
    summary: `${title}: ${[...rows].sort((a, b) => b.total - a.total).slice(0, 5).map((r) => `${r.key} ${fmt(r.total)}`).join(', ')}.`,
  };

/** The live HUD for one semantic model, with its drawers and the visual workbench. */
export function DashboardScreen(p: DashboardScreenProps) {
  const { model, filters } = p;
  const dims = useMemo(() => dimensionsOf(model), [model]);
  const fmt = useMemo(() => formattersFor(model), [model]);
  const series = useMemo<SeriesMeta[]>(() => model.series.map((s, i) => ({ label: s.label, short: s.short ?? s.label, color: `var(--hud-s${i})` })), [model]);
  const hasUnits = model.series.every((s) => s.units?.trim());
  const n = model.series.length;
  const dim = (id: string) => dims.find((d) => d.id === id);
  const time = dim('time');
  const geo = dim('geo');
  const category = dim('category');

  const [drawer, setDrawer] = useState<Drawer>(null);
  const [burst, setBurst] = useState<{ id: number; label: string; value: string } | null>(null);
  const [glitch, setGlitch] = useState(false);
  const burstId = useRef(0);

  const kpi = useRows(model.connector, useMemo(() => kpiQuery(model, filters, dims), [model, filters, dims]));
  const timeQ = useRows(model.connector, useMemo(() => (time ? breakdownQuery(model, time, filters, dims, { order: 'dimension' }) : undefined), [model, time, filters, dims]));
  const geoQ = useRows(model.connector, useMemo(() => (geo ? breakdownQuery(model, geo, filters, dims, { order: 'total', topN: 60 }) : undefined), [model, geo, filters, dims]));
  const catQ = useRows(model.connector, useMemo(() => (category ? breakdownQuery(model, category, filters, dims, { order: 'total', topN: 24 }) : undefined), [model, category, filters, dims]));

  const kpis: Kpis | undefined = useMemo(() => toKpis(kpi.data, n, hasUnits), [kpi.data, n, hasUnits]);
  const times = useMemo(() => toSplitRows(timeQ.data, n), [timeQ.data, n]);
  const geos = useMemo(() => toSplitRows(geoQ.data, n), [geoQ.data, n]);
  const cats = useMemo(() => toSplitRows(catQ.data, n), [catQ.data, n]);

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const select = useCallback(
    (dimId: string, value: string | number, additive: boolean) => {
      const next = toggleValue(filtersRef.current, dimId, value, additive);
      const added = (next[dimId] ?? []).includes(value) && !(filtersRef.current[dimId] ?? []).includes(value);
      if (added && isFeatureOn('lockBurst')) {
        burstId.current += 1;
        setBurst({ id: burstId.current, label: (dims.find((d) => d.id === dimId)?.label ?? dimId).toUpperCase(), value: String(value).toUpperCase() });
        setGlitch(true);
      }
      p.onFilters(next);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- p.onFilters is stable enough; filters come from the ref
    [dims, p.onFilters]
  );

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(null), 1700);
    return () => clearTimeout(t);
  }, [burst]);
  useEffect(() => {
    if (!glitch) return;
    const t = setTimeout(() => setGlitch(false), 340);
    return () => clearTimeout(t);
  }, [glitch]);

  const workbenchOn = features.views?.workbench !== false && isFeatureOn('visualBuilder');
  const drill = isFeatureOn('drillThrough') && (model.detail?.columns?.length ?? 0) > 0;
  const openDetail = drill ? () => setDrawer('detail') : undefined;
  const ctx: DashboardContextValue = { model, dims, series, hasUnits, fmt, filters, select, openDetail };

  const active = activeKeys(filters);
  const busy = kpi.loading || timeQ.loading || geoQ.loading || catQ.loading;
  const insights = useMemo(
    () => buildInsights({ kpis, time: times, geo: geos, category: cats, labels: { time: time?.label, geo: geo?.label, category: category?.label }, series, fmt }),
    [kpis, times, geos, cats, time, geo, category, series, fmt]
  );
  const legend = series.map((s) => <span key={s.label} style={{ color: s.color, marginRight: 10 }}>━ {s.short}</span>);

  return (
    <DashboardContext.Provider value={ctx}>
      <LockBurst burst={burst} />
      <div className={`hud-dash ${glitch ? 'hud-glitch' : ''}`}>
        <div className="hud-toolbar" role="toolbar" aria-label="Dashboard tools">
          <div className="hud-tabs" role="tablist" aria-label="View">
            <button type="button" role="tab" aria-selected={p.mode === 'hud'} className="hud-tab" onClick={() => p.onMode('hud')}>
              <Radar className="icon-size-200" aria-hidden /> {p.title}
            </button>
            {workbenchOn ? (
              <button type="button" role="tab" aria-selected={p.mode === 'workbench'} className="hud-tab" onClick={() => p.onMode('workbench')}>
                <LayoutGrid className="icon-size-200" aria-hidden /> Workbench
              </button>
            ) : null}
          </div>

          <div className="hud-locks" aria-live="polite">
            {active.length === 0 ? (
              <span className="hud-label">◇ {brand.copy?.hint ?? 'Click any mark to lock on · Ctrl + click to add'}</span>
            ) : (
              <>
                <span className="hud-label">Target lock</span>
                {active.map((k) => (
                  <button key={k} type="button" className="hud-tag" onClick={() => p.onFilters(clearKey(filters, k))} aria-label={`Remove ${dim(k)?.label ?? k} filter`}>
                    {dim(k)?.label ?? k} <b>{(filters[k] ?? []).length > 2 ? `${filters[k]!.length} selected` : (filters[k] ?? []).join(', ')}</b> ✕
                  </button>
                ))}
                {active.length > 1 ? <button type="button" className="hud-btn" onClick={() => p.onFilters({})}>Release all</button> : null}
              </>
            )}
          </div>

          <div className="hud-tools">
            <span className="flex items-center gap-200 hud-label" aria-label={busy ? 'Querying the model' : 'Connected to the model'}>
              <span className="hud-dot-live" style={busy ? { background: 'var(--hud-sun)', boxShadow: '0 0 10px var(--hud-sun)' } : undefined} />
              {busy ? 'Querying' : 'Link stable'}
            </span>
            {isFeatureOn('filtersPane') ? (
              <button type="button" className="hud-btn" onClick={() => setDrawer('filters')}><Filter className="icon-size-200" aria-hidden /> Filters</button>
            ) : null}
            {drill ? <button type="button" className="hud-btn" onClick={() => setDrawer('detail')}><Table2 className="icon-size-200" aria-hidden /> Detail</button> : null}
            {isFeatureOn('savedViews') ? (
              <button type="button" className="hud-btn" onClick={() => setDrawer('views')}><Bookmark className="icon-size-200" aria-hidden /> Views</button>
            ) : null}
          </div>
        </div>

        {p.mode === 'workbench' && workbenchOn ? (
          <Workbench scope={`${p.profileId}.${p.itemId}`} />
        ) : (
          <main className="hud-grid">
            {isModuleOn('core') ? (
              <Panel code="01" title="Core" hint={series.map((s) => s.short).join(' vs ')} className="hud-area-core" onDetail={openDetail}>
                {panelState(kpi, Boolean(kpis), false) ?? <SalesCore kpis={kpis!} />}
              </Panel>
            ) : null}
            {isModuleOn('readouts') ? (
              <Panel code="02" title="Readouts" className="hud-area-kpis"
                data={kpis && { title: 'Readouts', header: ['Series', 'Value'], rows: [...series.map((s, i) => [s.label, kpis.values[i]]), ['Total', kpis.total]], summary: `Total ${fmt.full(kpis.total)}: ${series.map((s, i) => `${s.label} ${fmt.value(kpis.values[i] ?? 0)}`).join(', ')}.` }}>
                {panelState(kpi, Boolean(kpis), false) ?? <Readouts kpis={kpis!} />}
              </Panel>
            ) : null}
            {geo && isModuleOn('globe') ? (
              <Panel code="03" title="Global theatre" hint="Click a beacon" className="hud-area-globe" data={splitData(geo.label, geo.label, series, geos, fmt.value)} onDetail={openDetail}>
                {panelState(geoQ, Boolean(geos), geos?.length === 0) ?? <HoloGlobe rows={geos!} />}
              </Panel>
            ) : null}
            {geo && isModuleOn('targetList') ? (
              <Panel code="04" title="Target list" hint="By total" className="hud-area-list" data={splitData(`Ranking by ${geo.label}`, geo.label, series, geos, fmt.value)} onDetail={openDetail}>
                {panelState(geoQ, Boolean(geos), geos?.length === 0) ?? <TargetList rows={geos!} dimId="geo" />}
              </Panel>
            ) : null}
            {category && isModuleOn('category') ? (
              <Panel code="05" title={`${category.label} spectrum`} hint="Ring = series share" className="hud-area-colors" data={splitData(category.label, category.label, series, cats, fmt.value)} onDetail={openDetail}>
                {panelState(catQ, Boolean(cats), cats?.length === 0) ?? <ColorBubbles rows={cats!} />}
              </Panel>
            ) : null}
            {time && isModuleOn('trend') ? (
              <Panel code="06" title="Trajectory" hint={legend} className="hud-area-year" data={splitData(`By ${time.label}`, time.label, series, times, fmt.value)} onDetail={openDetail}>
                {panelState(timeQ, Boolean(times), times?.length === 0) ?? <Trend rows={times!} />}
              </Panel>
            ) : null}
            {isModuleOn('insights') ? (
              <Panel code="07" title="Insight feed" hint="Computed live" className="hud-area-feed"
                data={{ title: 'Insights', header: ['Insight'], rows: insights.map((l) => [l]), summary: insights.join('\n') }}>
                {kpi.error ? panelState(kpi, false, false) : <InsightFeed lines={insights} />}
              </Panel>
            ) : null}
          </main>
        )}
      </div>

      {drawer === 'filters' ? <FiltersPane onClose={() => setDrawer(null)} onChange={p.onFilters} /> : null}
      {drawer === 'detail' ? <DetailDrawer onClose={() => setDrawer(null)} /> : null}
      {drawer === 'views' ? (
        <ViewsMenu profileId={p.profileId} itemId={p.itemId} filters={filters} dims={dims} onApply={p.onFilters}
          onOpenElsewhere={p.onOpenElsewhere} dimsFor={p.dimsFor} deepLinks={p.deepLinks} onClose={() => setDrawer(null)} />
      ) : null}
    </DashboardContext.Provider>
  );
}
