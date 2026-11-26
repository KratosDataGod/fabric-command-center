import { describe, expect, it } from 'vitest';

import { change, periodComparison } from './compare';

const rows = [2022, 2023, 2024].map((y, i) => ({ key: y, values: [100 * (i + 1), 50], total: 100 * (i + 1) + 50 }));

describe('periodComparison', () => {
  it('compares the latest period with the one before when nothing is selected', () => {
    expect(periodComparison(rows, [])).toMatchObject({ current: 2024, previous: 2023, latest: true, total: 350, previousTotal: 250 });
  });
  it('compares a selected period with the one before it', () => {
    expect(periodComparison(rows, [2023])).toMatchObject({ current: 2023, previous: 2022, latest: false });
  });
  it('has no comparison for the first period, several periods or too little data', () => {
    expect(periodComparison(rows, [2022])).toBeUndefined();
    expect(periodComparison(rows, [2022, 2023])).toBeUndefined();
    expect(periodComparison(rows.slice(0, 1), [])).toBeUndefined();
    expect(periodComparison(rows, [1999])).toBeUndefined();
  });
});

describe('change', () => {
  it('is relative and undefined on a zero base', () => {
    expect(change(120, 100)).toBeCloseTo(0.2);
    expect(change(80, 100)).toBeCloseTo(-0.2);
    expect(change(5, 0)).toBeUndefined();
    expect(change(-50, -100)).toBeCloseTo(0.5);
  });
});
