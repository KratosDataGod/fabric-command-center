import { describe, expect, it } from 'vitest';

import { formattersFor } from './format';
import { toCsv, toKpis, toSplitRows } from './rows';

describe('rows', () => {
  it('parses split rows for any series count and drops blank members', () => {
    const rows = toSplitRows([['A', 1, 2, 3], [null, 5, 5, 10], ['B', '4', null, 4]], 2)!;
    expect(rows).toEqual([
      { key: 'A', values: [1, 2], total: 3 },
      { key: 'B', values: [4, 0], total: 4 },
    ]);
  });
  it('parses kpis with and without units', () => {
    expect(toKpis([[10, 20, 1, 2]], 2, true)).toEqual({ values: [10, 20], total: 30, units: [1, 2], unitsTotal: 3 });
    expect(toKpis([[10]], 1, false)).toEqual({ values: [10], total: 10 });
    expect(toKpis([], 1, false)).toBeUndefined();
  });
  it('writes safe CSV', () => {
    expect(toCsv(['a', 'b'], [['x,y', '=SUM(A1)'], [1, null]])).toBe(`a,b\r\n"x,y",'=SUM(A1)\r\n1,`);
  });
  it('keeps negative numbers as numbers in CSV', () => {
    expect(toCsv(['n'], [[-5]])).toBe('n\r\n-5');
  });
});

describe('formatters', () => {
  it('respects locale and currency', () => {
    const f = formattersFor({ locale: 'de-DE', currency: 'EUR', valueFormat: 'currency' });
    expect(f.full(1234)).toContain('€');
    expect(formattersFor({ valueFormat: 'number' }).value(1500)).toBe('1.5K');
  });
});
