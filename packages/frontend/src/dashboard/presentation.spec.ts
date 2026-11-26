import { describe, expect, it } from 'vitest';

import { buildTour, stepFilters } from './presentation';

const dims = [
  { id: 'time', label: 'Year', column: "'D'[Y]", role: 'time' as const },
  { id: 'geo', label: 'Country', column: "'G'[C]", role: 'geo' as const },
];
const row = (key: string | number, total: number) => ({ key, values: [total], total });

describe('buildTour', () => {
  it('goes overview, top markets by total, then latest period', () => {
    const tour = buildTour(dims, { geo: [row('A', 1), row('B', 9), row('C', 5)], time: [row(2023, 1), row(2024, 2)] });
    expect(tour.map((s) => s.caption)).toEqual(['Overview', 'Country: B', 'Country: C', 'Country: A', 'Year: 2024']);
    expect(stepFilters(tour[1]!)).toEqual({ geo: ['B'] });
    expect(stepFilters(tour[0]!)).toEqual({});
  });
});
