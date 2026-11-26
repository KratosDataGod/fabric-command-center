import { describe, expect, it } from 'vitest';

import type { ModelConfig } from '@/config';
import { dimensionsOf } from '@/state/filters';

import { breakdownQuery, builderQuery, detailQuery, filterArgs, kpiQuery, literal, treatAs, valuesQuery } from './builder';

const model: ModelConfig = {
  id: 'test',
  connector: 'salesmodel',
  series: [
    { id: 'web', label: 'Web', value: "SUM ( 'Sales'[Web] )", units: "SUM ( 'Sales'[WebQty] )" },
    { id: 'shop', label: 'Shop', value: '[Shop Sales]', units: '[Shop Qty]' },
  ],
  dimensions: {
    time: { label: 'Year', column: "'Date'[Year]" },
    geo: { label: 'Country', column: "'Geo'[Country]" },
    category: { label: 'Color', column: "'Product'[Color]" },
  },
  extraFilters: [{ id: 'region', label: 'Region', column: "'Geo'[Region]" }],
  detail: { columns: [{ label: 'Product', column: "'Product'[Name]" }], maxRows: 50 },
};
const dims = dimensionsOf(model);

describe('literal', () => {
  it('quotes strings and doubles embedded quotes', () => {
    expect(literal('Bob "The" Builder')).toBe('"Bob ""The"" Builder"');
  });
  it('keeps numbers bare and rejects non-finite numbers', () => {
    expect(literal(2023)).toBe('2023');
    expect(() => literal(Number.NaN)).toThrow();
  });
});

describe('filterArgs', () => {
  it('emits one TREATAS per active dimension and skips excluded ones', () => {
    const args = filterArgs({ time: [2023, 2024], geo: ['France'], category: [] }, dims, ['geo']);
    expect(args).toEqual([treatAs("'Date'[Year]", [2023, 2024])]);
    expect(args[0]).toBe("TREATAS ( { 2023, 2024 }, 'Date'[Year] )");
  });
  it('ignores filters for unknown dimensions', () => {
    expect(filterArgs({ hacked: ['x'] }, dims)).toEqual([]);
  });
});

describe('queries', () => {
  it('kpi query wraps ROW in CALCULATETABLE with series then units', () => {
    const q = kpiQuery(model, { geo: ['France'] }, dims);
    expect(q).toContain('CALCULATETABLE');
    expect(q.indexOf('"S1"')).toBeLessThan(q.indexOf('"U0"'));
    expect(q).toContain(`TREATAS ( { "France" }, 'Geo'[Country] )`);
  });
  it('kpi query drops units when a series has none', () => {
    const noUnits = { ...model, series: [{ ...model.series[0], units: undefined }, model.series[1]] };
    expect(kpiQuery(noUnits, {}, dims)).not.toContain('"U0"');
  });
  it('breakdown excludes its own dimension and adds a total', () => {
    const geo = dims.find((d) => d.id === 'geo')!;
    const q = breakdownQuery(model, geo, { geo: ['France'], time: [2024] }, dims, { order: 'total' });
    expect(q).not.toContain('"France"');
    expect(q).toContain("TREATAS ( { 2024 }, 'Date'[Year] )");
    expect(q).toContain(`"T", ( SUM ( 'Sales'[Web] ) ) + ( [Shop Sales] )`);
    expect(q).toContain("NOT ISBLANK ( 'Geo'[Country] )");
    expect(q.trim().endsWith('ORDER BY [T] DESC')).toBe(true);
  });
  it('time breakdown orders by the dimension', () => {
    const q = breakdownQuery(model, dims[0], {}, dims, { order: 'dimension' });
    expect(q.trim().endsWith("ORDER BY 'Date'[Year] ASC")).toBe(true);
  });
  it('values query lists members with totals', () => {
    const q = valuesQuery(model, dims[3], { region: ['Europe'] }, dims);
    expect(q).not.toContain('"Europe"');
    expect(q).toContain("'Geo'[Region]");
  });
  it('detail query caps rows and keeps filters', () => {
    const q = detailQuery(model, { category: ['Red'] }, dims)!;
    expect(q).toContain('TOPN (\n    50,');
    expect(q).toContain('"Red"');
  });
  it('detail query is skipped without detail columns', () => {
    expect(detailQuery({ ...model, detail: undefined }, {}, dims)).toBeUndefined();
  });
  it('builder query clamps topN', () => {
    expect(builderQuery(dims[1], '[X]', {}, dims, 999)).toContain('TOPN ( 100,');
  });
});
