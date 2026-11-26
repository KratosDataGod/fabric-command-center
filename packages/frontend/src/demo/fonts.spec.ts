import { describe, expect, it } from 'vitest';

import { googleFontsUrl } from './fonts';

describe('googleFontsUrl', () => {
  it('lists each web font once and skips system fonts', () => {
    const url = googleFontsUrl({ heading: 'Chakra Petch', body: 'Segoe UI', mono: 'JetBrains Mono', comic: 'Bangers' });
    expect(url).toBe('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Bangers&display=swap');
    expect(googleFontsUrl({ heading: 'Segoe UI', body: 'Segoe UI' })).toBe('');
  });
});
