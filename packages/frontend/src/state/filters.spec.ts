import { describe, expect, it } from 'vitest';

import type { ModelConfig } from '@/config';

import { dimensionsOf, sanitizeFilters, toggleValue } from './filters';

const model = {
  connector: 'c',
  series: [{ id: 'a', label: 'A', value: '[A]' }],
  dimensions: { time: { label: 'Year', column: "'D'[Y]" }, geo: { label: 'Country', column: "'G'[C]" } },
} as ModelConfig;

describe('toggleValue', () => {
  it('plain click selects one value, then clears it', () => {
    const once = toggleValue({}, 'geo', 'France', false);
    expect(once).toEqual({ geo: ['France'] });
    expect(toggleValue(once, 'geo', 'France', false)).toEqual({});
  });
  it('plain click on another value replaces the selection', () => {
    expect(toggleValue({ geo: ['France', 'Germany'] }, 'geo', 'Canada', false)).toEqual({ geo: ['Canada'] });
  });
  it('additive click adds and removes', () => {
    const two = toggleValue({ geo: ['France'] }, 'geo', 'Germany', true);
    expect(two).toEqual({ geo: ['France', 'Germany'] });
    expect(toggleValue(two, 'geo', 'France', true)).toEqual({ geo: ['Germany'] });
  });
});

describe('sanitizeFilters', () => {
  it('keeps only known dimensions and primitive values', () => {
    const dims = dimensionsOf(model);
    const dirty = { geo: ['France', { evil: 1 }, 7], time: 'nope', other: ['x'], __proto__: { geo: ['y'] } };
    expect(sanitizeFilters(dirty, dims)).toEqual({ geo: ['France', 7] });
    expect(sanitizeFilters(null, dims)).toEqual({});
  });
});
