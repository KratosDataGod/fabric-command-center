import { type Dimension, type Filters, sanitizeFilters } from './filters';

export type Screen = 'launchpad' | 'dashboard' | 'report' | 'workbench';

/** Everything needed to reopen exactly what someone was looking at. */
export interface Route {
  profile: string;
  screen: Screen;
  /** Tile id for dashboard, report and workbench screens. */
  item?: string;
  filters?: Filters;
}

const SCREENS: Screen[] = ['launchpad', 'dashboard', 'report', 'workbench'];

/** Validates a route from a shared link or saved state against the current config. */
export function sanitizeRoute(
  input: unknown,
  known: { profiles: string[]; items: (profile: string) => string[]; dims: (profile: string, item: string) => Dimension[] | undefined }
): Route | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const r = input as Record<string, unknown>;
  if (typeof r.profile !== 'string' || !known.profiles.includes(r.profile)) return undefined;
  const screen = SCREENS.includes(r.screen as Screen) ? (r.screen as Screen) : 'launchpad';
  if (screen === 'launchpad') return { profile: r.profile, screen };
  if (typeof r.item !== 'string' || !known.items(r.profile).includes(r.item)) return { profile: r.profile, screen: 'launchpad' };
  const dims = known.dims(r.profile, r.item);
  return { profile: r.profile, screen, item: r.item, filters: dims ? sanitizeFilters(r.filters, dims) : undefined };
}
