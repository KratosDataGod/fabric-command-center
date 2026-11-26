import { describe, expect, it } from 'vitest';

import type { Dimension } from './filters';
import { sanitizeRoute } from './navigation';
import { decodeViewCode, encodeViewCode } from './views';

const dims: Dimension[] = [{ id: 'geo', label: 'Country', column: "'G'[C]", role: 'geo' }];
const dimsFor = (p: string, i: string) => (p === 'sales' && i === 'hud' ? dims : undefined);

describe('view codes', () => {
  it('round-trips, including non-ASCII names', () => {
    const code = encodeViewCode({ p: 'sales', i: 'hud', f: { geo: ['Côte d’Ivoire'] }, n: 'Afrique' });
    expect(decodeViewCode(`look at this: ${code}`, dimsFor)).toEqual({ v: 1, p: 'sales', i: 'hud', f: { geo: ['Côte d’Ivoire'] }, n: 'Afrique' });
  });
  it('rejects unknown targets and junk', () => {
    expect(decodeViewCode(encodeViewCode({ p: 'hr', i: 'x', f: {} }), dimsFor)).toBeUndefined();
    expect(decodeViewCode('FCC1.!!!!', dimsFor)).toBeUndefined();
    expect(decodeViewCode('hello', dimsFor)).toBeUndefined();
  });
  it('drops unknown filter keys from a code', () => {
    const code = encodeViewCode({ p: 'sales', i: 'hud', f: { geo: ['A'], evil: ['B'] } });
    expect(decodeViewCode(code, dimsFor)?.f).toEqual({ geo: ['A'] });
  });
});

describe('sanitizeRoute', () => {
  const known = { profiles: ['sales'], items: () => ['hud'], dims: dimsFor };
  it('accepts a valid route and cleans filters', () => {
    expect(sanitizeRoute({ profile: 'sales', screen: 'dashboard', item: 'hud', filters: { geo: ['A'], x: [1] } }, known)).toEqual({
      profile: 'sales', screen: 'dashboard', item: 'hud', filters: { geo: ['A'] },
    });
  });
  it('falls back to the launchpad for unknown items and rejects unknown profiles', () => {
    expect(sanitizeRoute({ profile: 'sales', screen: 'report', item: 'nope' }, known)).toEqual({ profile: 'sales', screen: 'launchpad' });
    expect(sanitizeRoute({ profile: 'admin' }, known)).toBeUndefined();
    expect(sanitizeRoute('junk', known)).toBeUndefined();
  });
});
