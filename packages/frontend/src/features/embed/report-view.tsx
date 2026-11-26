import { ExternalLink, LogIn } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { powerBi, type ReportItem } from '@/config';
import { HudError } from '@/hud/panel';
import { fabricReportUrl } from '@/shell/content';
import type { FilterValue, Filters } from '@/state/filters';

import type { EmbedHandle } from './powerbi-embed';

type Phase = 'starting' | 'sign-in' | 'loading' | 'ready' | 'error';

/**
 * A Power BI report embedded in the app, with the app's filters applied.
 * Experimental: needs a company-owned Entra app (see docs/power-bi-embed.md).
 */
export function ReportView({ item, filters, isDark, onSelect }: { item: ReportItem; filters: Filters; isDark: boolean; onSelect: (dimId: string, value: FilterValue) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const handle = useRef<EmbedHandle | null>(null);
  const filtersRef = useRef(filters);
  const selectRef = useRef(onSelect);
  const [phase, setPhase] = useState<Phase>('starting');
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);
  const [interactive, setInteractive] = useState(false);

  useEffect(() => {
    filtersRef.current = filters;
    selectRef.current = onSelect;
  });

  useEffect(() => {
    if (!powerBi || !host.current) return;
    let alive = true;
    const el = host.current;
    (async () => {
      try {
        const mod = await import('./powerbi-embed');
        const token = await mod.getPowerBiToken(powerBi, interactive);
        if (!alive) return;
        if (!token) return setPhase('sign-in');
        setPhase('loading');
        const embedUrl = await mod.getEmbedUrl(token, item.workspaceId, item.reportId);
        if (!alive) return;
        const h = mod.embedReport(el, { token, embedUrl, reportId: item.reportId, pageName: item.pageName, transparent: isDark }, (d, v) => selectRef.current(d, v), powerBi);
        handle.current = h;
        h.report.on('loaded', () => {
          if (!alive) return;
          setPhase('ready');
          void h.setFilters(filtersRef.current).catch(() => undefined);
        });
        h.report.on('error', (e) => {
          const detail = (e as { detail?: { message?: string } }).detail;
          if (alive) {
            setError(detail?.message ?? 'The report failed to load.');
            setPhase('error');
          }
        });
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(/popup|interaction_in_progress|user_cancelled/i.test(msg) ? 'Sign-in was cancelled or the pop-up was blocked. Allow pop-ups for Fabric and try again.' : msg);
        setPhase('error');
      }
    })();
    return () => {
      alive = false;
      handle.current?.destroy();
      handle.current = null;
    };
  }, [item.workspaceId, item.reportId, item.pageName, isDark, attempt, interactive]);

  useEffect(() => {
    if (phase === 'ready') void handle.current?.setFilters(filters).catch(() => undefined);
  }, [filters, phase]);

  return (
    <section className="hud-panel hud-report" aria-label={item.title}>
      <header className="hud-panel-head">
        <div className="flex min-w-0 items-baseline gap-300">
          <span className="hud-code">PBI</span>
          <h2 className="hud-title truncate">{item.title}</h2>
        </div>
        <a className="hud-btn" href={fabricReportUrl(item)} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="icon-size-200" aria-hidden /> Open in Fabric
        </a>
      </header>
      <div className="hud-body">
        {phase === 'sign-in' ? (
          <div className="hud-report-msg">
            <p>Sign in to Power BI once to show reports inside the app.</p>
            <button type="button" className="hud-btn" onClick={() => { setInteractive(true); setAttempt((a) => a + 1); }}>
              <LogIn className="icon-size-200" aria-hidden /> Sign in to Power BI
            </button>
          </div>
        ) : null}
        {phase === 'error' && error ? <HudError message={error} onRetry={() => { setError(undefined); setPhase('starting'); setAttempt((a) => a + 1); }} /> : null}
        {phase === 'starting' || phase === 'loading' ? <div className="hud-skel" aria-label="Loading report" /> : null}
        <div ref={host} className="hud-report-host" style={{ visibility: phase === 'ready' || phase === 'loading' ? 'visible' : 'hidden' }} />
      </div>
    </section>
  );
}
