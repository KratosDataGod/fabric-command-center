import { describe, expect, it } from 'vitest';

import { formattersFor } from '@/data/format';

import { buildInsights } from './insights';

const fmt = formattersFor({ valueFormat: 'currency', currency: 'USD', locale: 'en-US' });
const series = [
  { label: 'Internet', short: 'WEB', color: 'red' },
  { label: 'Reseller', short: 'RESELL', color: 'blue' },
];

describe('buildInsights', () => {
  it('computes every line from the rows given', () => {
    const lines = buildInsights({
      kpis: { values: [30, 70], total: 100, units: [3, 14], unitsTotal: 17 },
      time: [{ key: 2023, values: [10, 30], total: 40 }, { key: 2024, values: [20, 40], total: 60 }],
      geo: [{ key: 'France', values: [5, 5], total: 10 }, { key: 'Canada', values: [1, 89], total: 90 }],
      category: [{ key: 'Red', values: [1, 1], total: 2 }],
      labels: { geo: 'Country', category: 'Color' },
      series,
      fmt,
    });
    expect(lines).toContain('TOP COUNTRY: CANADA — 90% OF $100 ACROSS 2.');
    expect(lines).toContain('2024 UP 50% VS 2023 — $60 TOTAL.');
    expect(lines).toContain('RESELLER CARRIES 70% OF THE TOTAL IN THE CURRENT VIEW.');
    expect(lines).toContain('PER UNIT: INTERNET $10 VS RESELLER $5.');
    expect(lines.some((l) => l.startsWith('CANADA LEANS MOST ON RESELLER'))).toBe(true);
  });
  it('returns nothing without data', () => {
    expect(buildInsights({ labels: {}, series, fmt })).toEqual([]);
  });
});
