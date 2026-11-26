import type { BrandConfig } from '@/config';

const SYSTEM = new Set(['Segoe UI', 'Consolas']);

/** One Google Fonts stylesheet for the chosen families (system fonts are skipped). */
export function googleFontsUrl(fonts: NonNullable<BrandConfig['fonts']>): string {
  const families = [...new Set([fonts.heading, fonts.body, fonts.mono, fonts.comic].filter((f): f is string => Boolean(f) && !SYSTEM.has(f!)))];
  if (!families.length) return '';
  const weights = (f: string) => (f === fonts.comic && f !== fonts.heading ? '' : ':wght@400;500;600;700');
  return `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f.replace(/ /g, '+')}${weights(f)}`).join('&')}&display=swap`;
}

