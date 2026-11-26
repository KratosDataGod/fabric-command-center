import { describe, expect, it } from 'vitest';

import { locate, norm } from './countries';

describe('locate', () => {
  it('places common BI spellings', () => {
    const us = locate('United States')!;
    expect(us[0]).toBeGreaterThan(-125);
    expect(us[0]).toBeLessThan(-65); // contiguous US, not dragged west by Alaska
    expect(locate('UK')).toEqual(locate('United Kingdom'));
    expect(locate("Côte d'Ivoire")).toBeDefined();
    expect(locate('Czech Republic')).toEqual(locate('Czechia'));
  });
  it('uses the largest landmass for France', () => {
    const [lon, lat] = locate('France')!;
    expect(lon).toBeGreaterThan(-5);
    expect(lat).toBeGreaterThan(41);
  });
  it('knows small countries missing from the map', () => {
    expect(locate('Singapore')).toEqual([103.82, 1.35]);
  });
  it('honours config overrides and aliases', () => {
    expect(locate('HQ', { HQ: [1, 2] })).toEqual([1, 2]);
    expect(locate('Deutschland', undefined, { Deutschland: 'Germany' })).toEqual(locate('Germany'));
    expect(locate('Atlantis')).toBeUndefined();
  });
  it('normalises names', () => {
    expect(norm('  Côte  d’Ivoire ')).toBe('cote d ivoire');
  });
});
