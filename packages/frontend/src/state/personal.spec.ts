import { describe, expect, it } from 'vitest';

import { addRecent, sanitizePersonal, togglePin } from './personal';

const all = () => true;

describe('personal shortcuts', () => {
  it('drops junk and tiles that no longer exist', () => {
    const p = sanitizePersonal({ pins: [{ profile: 'a', item: 'x' }, { profile: 'a' }, 'bad', { profile: 'gone', item: 'y' }], recent: 'nope' }, (r) => r.profile !== 'gone');
    expect(p).toEqual({ pins: [{ profile: 'a', item: 'x' }], recent: [] });
  });

  it('toggles pins and keeps recents unique, newest first, capped', () => {
    let p = sanitizePersonal({}, all);
    p = togglePin(p, { profile: 'a', item: 'x' });
    expect(p.pins).toHaveLength(1);
    p = togglePin(p, { profile: 'a', item: 'x' });
    expect(p.pins).toHaveLength(0);
    for (let i = 0; i < 12; i++) p = addRecent(p, { profile: 'a', item: `t${i % 10}` }, i);
    expect(p.recent).toHaveLength(8);
    expect(p.recent[0]).toMatchObject({ item: 't1' });
    expect(new Set(p.recent.map((r) => r.item)).size).toBe(8);
  });
});
