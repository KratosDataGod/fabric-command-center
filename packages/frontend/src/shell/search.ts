import { type ContentItem, profiles } from '@/config';

export interface TileHit {
  profileId: string;
  profileName: string;
  section: string;
  item: ContentItem;
}

/** Every tile in every enabled profile, for search and shortcuts. */
export const allTiles: TileHit[] = profiles.flatMap((p) =>
  p.sections.flatMap((s) => s.items.map((item) => ({ profileId: p.id, profileName: p.name, section: s.title, item })))
);

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/**
 * Rank text against a query: every word must match somewhere; title matches,
 * word starts and exact prefixes rank higher. Returns 0 for no match.
 */
export function score(query: string, title: string, ...rest: (string | undefined)[]): number {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (!words.length) return 1;
  const t = norm(title);
  const other = norm(rest.filter(Boolean).join(' '));
  let total = 0;
  for (const w of words) {
    if (t.startsWith(w)) total += 6;
    else if (new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(t)) total += 4;
    else if (t.includes(w)) total += 3;
    else if (other.includes(w)) total += 1;
    else return 0;
  }
  return total;
}
