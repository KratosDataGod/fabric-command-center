import { describe, expect, it } from 'vitest';

import { toReportFilters } from './powerbi-embed';

describe('toReportFilters', () => {
  it('maps only targeted filters to basic In filters', () => {
    const out = toReportFilters({ geo: ['France', 'Canada'], time: [], other: ['x'] }, { geo: { table: 'Geo', column: 'Country' }, time: { table: 'Date', column: 'Year' } });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ target: { table: 'Geo', column: 'Country' }, operator: 'In', values: ['France', 'Canada'] });
  });
});
