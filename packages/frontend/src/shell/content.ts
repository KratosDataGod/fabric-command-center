import { type ContentItem, isEmbedReady, models, profiles, type ProfileConfig, type ReportItem } from '@/config';
import { dimensionsOf, type Dimension } from '@/state/filters';
import type { Route, Screen } from '@/state/navigation';

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const itemsOf = (p: ProfileConfig): ContentItem[] => p.sections.flatMap((s) => s.items);
export const findProfile = (id: string | undefined) => profiles.find((p) => p.id === id);
export const findItem = (profileId: string | undefined, itemId: string | undefined) =>
  itemsOf(findProfile(profileId) ?? { sections: [] } as unknown as ProfileConfig).find((i) => i.id === itemId);

export const isReportSetUp = (r: ReportItem) => GUID.test(r.workspaceId) && GUID.test(r.reportId);

/** The report's page in the Fabric portal, for "Open in Fabric" and when embedding is off. */
export function fabricReportUrl(r: ReportItem): string {
  const base = `https://app.fabric.microsoft.com/groups/${r.workspaceId}/reports/${r.reportId}`;
  return r.pageName ? `${base}/${encodeURIComponent(r.pageName)}` : base;
}

export function dimsFor(profileId: string, itemId: string): Dimension[] | undefined {
  const item = findItem(profileId, itemId);
  if (item?.type === 'dashboard') {
    const m = models[item.model];
    return m ? dimensionsOf(m) : undefined;
  }
  // Embedded reports share the app's filter ids, so they keep any filter a dashboard could set.
  if (item?.type === 'report') {
    const all = Object.values(models).flatMap(dimensionsOf);
    return all.filter((d, i) => all.findIndex((x) => x.id === d.id) === i);
  }
  return undefined;
}

export const known = {
  profiles: profiles.map((p) => p.id),
  items: (profile: string) => itemsOf(findProfile(profile) ?? ({ sections: [] } as unknown as ProfileConfig)).map((i) => i.id),
  dims: dimsFor,
};

/** The screen a tile opens, or undefined when it opens outside the app. */
export function screenFor(item: ContentItem): Screen | undefined {
  if (item.type === 'dashboard') return 'dashboard';
  if (item.type === 'report' && isEmbedReady && isReportSetUp(item)) return 'report';
  return undefined;
}

export const PROFILE_KEY = 'fcc.profile';

export function defaultRoute(): Route {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(PROFILE_KEY);
  } catch {
    // Storage blocked: start on the first profile.
  }
  return { profile: findProfile(saved ?? undefined)?.id ?? profiles[0]?.id ?? '', screen: 'launchpad' };
}

export function rememberProfile(id: string) {
  try {
    localStorage.setItem(PROFILE_KEY, id);
  } catch {
    // Not fatal.
  }
}
