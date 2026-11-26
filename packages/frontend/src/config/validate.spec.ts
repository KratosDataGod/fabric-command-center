import { describe, expect, it } from 'vitest';

import brand from '@customize/brand/brand.json';
import kratos from '@customize/brands/kratosbi/brand.json';
import features from '@customize/features.json';
import admin from '@customize/profiles/admin.json';
import hr from '@customize/profiles/hr.json';
import model from '@customize/models/sales.json';
import ops from '@customize/profiles/operations.json';
import sales from '@customize/profiles/sales.json';

import type { BrandConfig, ModelConfig, ProfileConfig } from './types';
import { validateBrand, validateFeatures, validateModel, validateProfiles, validateTogether } from './validate';

describe('shipped customize/ files', () => {
  it('are valid', () => {
    expect(validateBrand(brand as unknown as BrandConfig)).toEqual([]);
    expect(validateBrand(kratos as unknown as BrandConfig)).toEqual([]);
    expect(validateModel(model as unknown as ModelConfig)).toEqual([]);
    expect(validateFeatures(features)).toEqual([]);
    expect(validateTogether(brand as unknown as BrandConfig, [model as unknown as ModelConfig])).toEqual([]);
    expect(validateProfiles([sales, admin, ops, hr] as unknown as ProfileConfig[], ['sales'])).toEqual([]);
  });
});

describe('validateModel', () => {
  const base = model as unknown as ModelConfig;
  it('rejects a non-column reference', () => {
    const bad = { ...base, dimensions: { ...base.dimensions, time: { label: 'Y', column: 'SUM(x)' } } };
    expect(validateModel(bad).join()).toContain('not a DAX column reference');
  });
  it('requires units on all series or none', () => {
    const bad = { ...base, series: [base.series[0], { ...base.series[1], units: undefined }] };
    expect(validateModel(bad).join()).toContain('units');
  });
  it('rejects too many series', () => {
    const s = base.series[0];
    const bad = { ...base, series: [1, 2, 3, 4, 5].map((i) => ({ ...s, id: `s${i}` })) };
    expect(validateModel(bad).join()).toContain('1 to 4');
  });
});

describe('validateProfiles', () => {
  const p = sales as unknown as ProfileConfig;
  it('flags a dashboard tile whose model file is missing', () => {
    expect(validateProfiles([p], []).join()).toContain('does not exist');
  });
  it('flags a non-https link and a bad report id', () => {
    const bad = {
      ...p,
      sections: [{ title: 'x', items: [
        { type: 'link', id: 'a', title: 'A', url: 'http://x' },
        { type: 'report', id: 'b', title: 'B', workspaceId: 'nope', reportId: '' },
      ] }],
    } as ProfileConfig;
    const out = validateProfiles([bad], ['sales']).join();
    expect(out).toContain('https://');
    expect(out).toContain('GUIDs');
  });
});
