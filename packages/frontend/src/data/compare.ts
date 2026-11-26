import type { FilterValue } from '@/state/filters';

import type { SplitRow } from './rows';

export interface Comparison {
  current: string | number;
  previous: string | number;
  /** true when nothing is selected and the latest period is compared with the one before it. */
  latest: boolean;
  values: number[];
  previousValues: number[];
  total: number;
  previousTotal: number;
}

/**
 * Period over period from the time breakdown already on screen (rows in time
 * order). One selected period is compared with the one before it; with no
 * time selection, the latest period with the one before it. Several selected
 * periods have no single "previous", so there is no comparison.
 */
export function periodComparison(times: SplitRow[] | undefined, selected: FilterValue[] | undefined): Comparison | undefined {
  if (!times || times.length < 2) return undefined;
  const picked = selected ?? [];
  if (picked.length > 1) return undefined;
  const index = picked.length === 1 ? times.findIndex((r) => r.key === picked[0]) : times.length - 1;
  if (index < 1) return undefined;
  const cur = times[index]!;
  const prev = times[index - 1]!;
  return {
    current: cur.key,
    previous: prev.key,
    latest: picked.length === 0,
    values: cur.values,
    previousValues: prev.values,
    total: cur.total,
    previousTotal: prev.total,
  };
}

/** Relative change, or undefined when the base is zero or missing. */
export function change(now: number | undefined, before: number | undefined): number | undefined {
  if (now === undefined || before === undefined || !Number.isFinite(now) || !Number.isFinite(before) || before === 0) return undefined;
  return (now - before) / Math.abs(before);
}
