import type { SplitRow } from '@/data/rows';
import type { Dimension, Filters } from '@/state/filters';

export interface TourStep {
  /** Undefined means "everything", the overview. */
  dimId?: string;
  value?: string | number;
  caption: string;
}

const topKeys = (rows: SplitRow[] | undefined, n: number) =>
  [...(rows ?? [])].sort((a, b) => b.total - a.total).slice(0, n).map((r) => r.key);

/**
 * The presentation tour: overview, the top markets, the top categories,
 * the latest period, then back to the overview. Built from what is on screen.
 */
export function buildTour(dims: Dimension[], rows: { geo?: SplitRow[]; category?: SplitRow[]; time?: SplitRow[] }): TourStep[] {
  const label = (id: string) => dims.find((d) => d.id === id)?.label ?? id;
  const steps: TourStep[] = [{ caption: 'Overview' }];
  for (const v of topKeys(rows.geo, 5)) steps.push({ dimId: 'geo', value: v, caption: `${label('geo')}: ${v}` });
  for (const v of topKeys(rows.category, 3)) steps.push({ dimId: 'category', value: v, caption: `${label('category')}: ${v}` });
  const latest = rows.time?.at(-1)?.key;
  if (latest !== undefined) steps.push({ dimId: 'time', value: latest, caption: `${label('time')}: ${latest}` });
  return steps;
}

export const stepFilters = (step: TourStep): Filters => (step.dimId && step.value !== undefined ? { [step.dimId]: [step.value] } : {});
