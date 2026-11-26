import { describe, expect, it } from 'vitest';

import { score } from './search';

describe('score', () => {
  it('requires every word and prefers title prefixes', () => {
    expect(score('cap met', 'Capacity Metrics', 'Admin')).toBeGreaterThan(score('met', 'Capacity Metrics'));
    expect(score('fuam core', 'Core report', 'FUAM')).toBeGreaterThan(0);
    expect(score('sales hr', 'Sales live')).toBe(0);
    expect(score('', 'anything')).toBe(1);
    expect(score('(', 'a (b)')).toBeGreaterThan(0);
  });
});
