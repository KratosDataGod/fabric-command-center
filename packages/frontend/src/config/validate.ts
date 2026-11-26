import type { BrandConfig, FeaturesConfig, ModelConfig, PowerBiConfig, ProfileConfig } from './types';

/** DAX column reference: 'Table Name'[Column] or Table[Column]. */
export const COLUMN_REF = /^('[^']+'|[A-Za-z_][\w ]*)\[[^\]]+\]$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const ID = /^[a-z][a-z0-9-]*$/;
const GUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/** Returns human-readable problems; an empty list means the config is usable. */
export function validateModel(m: ModelConfig, file = `models/${m?.id ?? '?'}.json`): string[] {
  const out: string[] = [];
  if (!m.id || !ID.test(m.id)) out.push(`${file}: "id" must be lowercase letters, digits or dashes and match the file name.`);
  if (!m.connector) out.push(`${file}: "connector" is required (the connector name in rayfin/rayfin.yml).`);
  if (!Array.isArray(m.series) || m.series.length < 1 || m.series.length > 4) {
    out.push(`${file}: "series" needs 1 to 4 entries.`);
  }
  const ids = new Set<string>();
  (m.series ?? []).forEach((s, i) => {
    if (!s.id || !ID.test(s.id)) out.push(`${file}: series[${i}].id must be lowercase letters, digits or dashes.`);
    if (ids.has(s.id)) out.push(`${file}: series id "${s.id}" is used twice.`);
    ids.add(s.id);
    if (!s.label) out.push(`${file}: series[${i}].label is required.`);
    if (!s.value?.trim()) out.push(`${file}: series[${i}].value needs a DAX expression.`);
  });
  const units = (m.series ?? []).filter((s) => s.units?.trim()).length;
  if (units > 0 && units !== m.series.length) {
    out.push(`${file}: give every series a "units" expression, or none of them.`);
  }
  const dims: [string, { column?: string } | undefined][] = [
    ['dimensions.time', m.dimensions?.time],
    ['dimensions.geo', m.dimensions?.geo],
    ['dimensions.category', m.dimensions?.category],
    ...(m.extraFilters ?? []).map((f, i) => [`extraFilters[${i}]`, f] as [string, { column?: string }]),
    ...(m.detail?.columns ?? []).map((c, i) => [`detail.columns[${i}]`, c] as [string, { column?: string }]),
  ];
  if (!m.dimensions?.time) out.push(`${file}: "dimensions.time" is required.`);
  for (const [where, d] of dims) {
    if (d && !COLUMN_REF.test(d.column ?? '')) {
      out.push(`${file}: ${where}.column "${d.column ?? ''}" is not a DAX column reference like 'Table'[Column].`);
    }
  }
  const filterIds = new Set(['time', 'geo', 'category']);
  (m.extraFilters ?? []).forEach((f, i) => {
    if (!ID.test(f.id)) out.push(`${file}: extraFilters[${i}].id must be lowercase letters, digits or dashes.`);
    if (filterIds.has(f.id)) out.push(`${file}: extraFilters id "${f.id}" clashes with another filter.`);
    filterIds.add(f.id);
  });
  return out;
}

export function validateBrand(b: BrandConfig): string[] {
  const out: string[] = [];
  if (!b.name) out.push('brand.json: "name" is required.');
  if (!b.logo) out.push('brand.json: "logo" is required.');
  if (!b.mark) out.push('brand.json: "mark" is required.');
  for (const look of ['hud', 'comic'] as const) {
    const p = b.colors?.[look];
    if (!p) {
      out.push(`brand.json: colors.${look} is missing.`);
      continue;
    }
    for (const [k, v] of Object.entries(p)) {
      if (k === 'series') continue;
      if (!HEX.test(String(v))) out.push(`brand.json: colors.${look}.${k} must be a #rrggbb colour.`);
    }
    if (!Array.isArray(p.series) || p.series.length === 0 || p.series.some((c) => !HEX.test(c))) {
      out.push(`brand.json: colors.${look}.series needs 1 to 4 #rrggbb colours.`);
    }
  }
  return out;
}

export function validateFeatures(f: FeaturesConfig): string[] {
  const out: string[] = [];
  if (f.shareUrl && !/^https:\/\//.test(f.shareUrl)) out.push('features.json: "shareUrl" must start with https://.');
  return out;
}

export function validatePowerBi(p: PowerBiConfig): string[] {
  const out: string[] = [];
  for (const k of ['clientId', 'tenantId'] as const) {
    if (!GUID.test(p[k] ?? '')) out.push(`powerbi.local.json: "${k}" must be a GUID.`);
    else if (/^0{8}-/.test(p[k])) out.push(`powerbi.local.json: "${k}" is still the placeholder.`);
  }
  return out;
}

/** Cross-file checks: every model's series count fits the brand palette. */
export function validateTogether(b: BrandConfig, models: ModelConfig[]): string[] {
  const out: string[] = [];
  for (const m of models) {
    for (const look of ['hud', 'comic'] as const) {
      const n = b.colors?.[look]?.series?.length ?? 0;
      if (n < (m.series?.length ?? 0)) {
        out.push(`brand.json: colors.${look}.series has ${n} colour(s) but models/${m.id}.json has ${m.series.length} series.`);
      }
    }
  }
  return out;
}

const GUID_OR_EMPTY = /^$|^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function validateProfiles(profiles: ProfileConfig[], modelIds: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of profiles) {
    const file = `profiles/${p.id ?? '?'}.json`;
    if (!p.id || !ID.test(p.id)) out.push(`${file}: "id" must be lowercase letters, digits or dashes.`);
    if (seen.has(p.id)) out.push(`${file}: profile id "${p.id}" is used twice.`);
    seen.add(p.id);
    if (!p.name) out.push(`${file}: "name" is required.`);
    const itemIds = new Set<string>();
    for (const s of p.sections ?? []) {
      for (const item of s.items ?? []) {
        if (itemIds.has(item.id)) out.push(`${file}: tile id "${item.id}" is used twice.`);
        itemIds.add(item.id);
        if (item.type === 'dashboard' && !modelIds.includes(item.model)) {
          out.push(`${file}: tile "${item.id}" uses model "${item.model}", but customize/models/${item.model}.json does not exist.`);
        }
        if (item.type === 'report' && (!GUID_OR_EMPTY.test(item.workspaceId ?? '') || !GUID_OR_EMPTY.test(item.reportId ?? ''))) {
          out.push(`${file}: tile "${item.id}" needs GUIDs (or empty strings) for workspaceId and reportId.`);
        }
        if (item.type === 'link' && !/^https:\/\//.test(item.url ?? '')) {
          out.push(`${file}: tile "${item.id}" url must start with https://.`);
        }
      }
    }
  }
  if (profiles.filter((p) => p.enabled !== false).length === 0) out.push('profiles/: no enabled profiles.');
  return out;
}
