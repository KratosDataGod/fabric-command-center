import type { SeriesMeta } from '@/dashboard/context';
import type { Formatters } from '@/data/format';
import { ratio } from '@/data/format';
import type { Kpis, SplitRow } from '@/data/rows';

export interface InsightInput {
  kpis?: Kpis;
  time?: SplitRow[];
  geo?: SplitRow[];
  category?: SplitRow[];
  labels: { time?: string; geo?: string; category?: string };
  series: SeriesMeta[];
  fmt: Formatters;
}

const top = (rows: SplitRow[]) => [...rows].sort((a, b) => b.total - a.total)[0];
const up = (v: string | number) => String(v).toUpperCase();

/** Plain-English observations computed only from the query results on screen. Never invented. */
export function buildInsights({ kpis, time, geo, category, labels, series, fmt }: InsightInput): string[] {
  const out: string[] = [];
  if (geo?.length) {
    const sum = geo.reduce((a, r) => a + r.total, 0);
    const t = top(geo)!;
    const share = ratio(t.total, sum);
    if (share !== undefined) out.push(`TOP ${up(labels.geo ?? 'market')}: ${up(t.key)} — ${fmt.pct(share)} OF ${fmt.value(sum)} ACROSS ${geo.length}.`);
    if (series.length > 1) {
      const last = series.length - 1;
      const skew = [...geo].filter((r) => r.total > 0).sort((a, b) => b.values[last]! / b.total - a.values[last]! / a.total)[0];
      if (skew) out.push(`${up(skew.key)} LEANS MOST ON ${up(series[last]!.label)}: ${fmt.pct(skew.values[last]! / skew.total)} OF ITS TOTAL.`);
    }
  }
  if (time && time.length >= 2) {
    const a = time[time.length - 2]!;
    const b = time[time.length - 1]!;
    const g = ratio(b.total - a.total, a.total);
    if (g !== undefined) out.push(`${up(b.key)} ${g >= 0 ? 'UP' : 'DOWN'} ${fmt.pct(Math.abs(g))} VS ${up(a.key)} — ${fmt.value(b.total)} TOTAL.`);
  }
  if (kpis && kpis.total && series.length > 1) {
    const i = kpis.values.indexOf(Math.max(...kpis.values));
    out.push(`${up(series[i]!.label)} CARRIES ${fmt.pct(kpis.values[i]! / kpis.total)} OF THE TOTAL IN THE CURRENT VIEW.`);
  }
  if (kpis?.units && series.length > 1) {
    const per = series.map((s, i) => [s.label, ratio(kpis.values[i]!, kpis.units![i]!)] as const).filter(([, v]) => v !== undefined);
    if (per.length > 1) out.push(`PER UNIT: ${per.map(([l, v]) => `${up(l)} ${fmt.value(v!)}`).join(' VS ')}.`);
  }
  if (category?.length) {
    const t = top(category)!;
    out.push(`TOP ${up(labels.category ?? 'category')}: ${up(t.key)} AT ${fmt.value(t.total)}.`);
  }
  return out;
}
