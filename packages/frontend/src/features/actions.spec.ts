import { describe, expect, it } from 'vitest';

import { mailtoUrl, safeFileName, teamsShareUrl } from './actions';

describe('actions', () => {
  it('builds share links with encoded text', () => {
    expect(teamsShareUrl('Sales & more', 'https://x.test/a')).toBe('https://teams.microsoft.com/share?msgText=Sales+%26+more&href=https%3A%2F%2Fx.test%2Fa');
    expect(mailtoUrl('Hi there', 'a&b')).toBe('mailto:?subject=Hi%20there&body=a%26b');
  });
  it('makes safe file names', () => {
    expect(safeFileName('Sales by country / 2024?')).toBe('Sales-by-country-2024');
    expect(safeFileName('***')).toBe('export');
  });
});
