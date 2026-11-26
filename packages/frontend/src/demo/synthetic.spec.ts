import { describe, expect, it } from 'vitest';

import { breakdownQuery, kpiQuery } from '@/dax/builder';
import { dimensionsOf } from '@/state/filters';
import sales from '@customize/models/sales.json';
import type { ModelConfig } from '@/config';

import { answer } from './synthetic';

const model = sales as unknown as ModelConfig;
const dims = dimensionsOf(model);

describe('demo data', () => {
  it('answers the KPI query with one row per series and units', () => {
    const rows = answer(kpiQuery(model, {}, dims));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveLength(model.series.length * 2);
  });

  it("shrinks when filtered and ignores a visual's own filter", () => {
    const geo = dims.find((d) => d.id === 'geo')!;
    const all = answer(breakdownQuery(model, geo, {}, dims, { order: 'total' }));
    // A visual ignores its own dimension's filter (it highlights instead), but other filters shrink it.
    const own = answer(breakdownQuery(model, geo, { geo: ['France'] }, dims, { order: 'total' }));
    expect(own).toEqual(all);
    const byYear = answer(breakdownQuery(model, geo, { time: [2023] }, dims, { order: 'total' }));
    expect(Number(byYear[0]!.at(-1))).toBeLessThan(Number(all[0]!.at(-1)));
    const time = answer(kpiQuery(model, { time: [2023] }, dims))[0]![0] as number;
    const any = answer(kpiQuery(model, {}, dims))[0]![0] as number;
    expect(time).toBeLessThan(any);
    expect(all.length).toBeGreaterThan(1);
  });
});
