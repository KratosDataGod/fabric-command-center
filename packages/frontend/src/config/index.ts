import brandJson from '@customize/brand/brand.json';
import featuresJson from '@customize/features.json';

import type { BrandConfig, FeaturesConfig, ModelConfig, ModuleId, PowerBiConfig, ProfileConfig } from './types';
import {
  validateBrand,
  validateFeatures,
  validateModel,
  validatePowerBi,
  validateProfiles,
  validateTogether,
} from './validate';

export * from './types';

export const brand = brandJson as unknown as BrandConfig;
export const features = featuresJson as unknown as FeaturesConfig;

const fileId = (path: string) => path.split('/').pop()!.replace(/\.json$/, '');

/** customize/models/*.json, keyed by file name. */
const modelFiles = import.meta.glob('@customize/models/*.json', { eager: true, import: 'default' }) as Record<string, ModelConfig>;
export const models: Record<string, ModelConfig> = Object.fromEntries(
  Object.entries(modelFiles).map(([path, m]) => [fileId(path), m])
);

/** customize/profiles/*.json, enabled ones only, in display order. */
const profileFiles = import.meta.glob('@customize/profiles/*.json', { eager: true, import: 'default' }) as Record<string, ProfileConfig>;
const allProfiles = Object.values(profileFiles);
export const profiles: ProfileConfig[] = allProfiles
  .filter((p) => p.enabled !== false)
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100) || a.name.localeCompare(b.name));

/** Brand asset files (logo, mark, favicon), resolved to built URLs. */
const assetUrls = import.meta.glob('@customize/brand/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

export function brandAsset(file: string | undefined): string | undefined {
  if (!file) return undefined;
  return Object.entries(assetUrls).find(([path]) => path.endsWith(`/brand/${file}`))?.[1];
}

/** Optional, git-ignored Power BI embed settings. */
const pbiFiles = import.meta.glob('@customize/powerbi.local.json', { eager: true, import: 'default' }) as Record<string, unknown>;
export const powerBi: PowerBiConfig | undefined = Object.values(pbiFiles)[0] as PowerBiConfig | undefined;
export const isEmbedReady = Boolean(features.views?.report && powerBi && validatePowerBi(powerBi).length === 0);

export const isModuleOn = (id: ModuleId) => features.modules?.[id] !== false;
export const isFeatureOn = (id: keyof NonNullable<FeaturesConfig['features']>) => features.features?.[id] !== false;
export const isActionOn = (id: keyof NonNullable<FeaturesConfig['actions']>) => features.actions?.[id] !== false;

/** Every problem in /customize, shown on screen instead of a half-broken app. */
export const configProblems: string[] = [
  ...validateBrand(brand),
  ...Object.entries(models).flatMap(([id, m]) => [
    ...validateModel(m, `models/${id}.json`),
    ...(m.id !== id ? [`models/${id}.json: "id" is "${m.id}" but must match the file name "${id}".`] : []),
  ]),
  ...validateProfiles(allProfiles, Object.keys(models)),
  ...validateFeatures(features),
  ...validateTogether(brand, Object.values(models)),
  ...(features.views?.report && powerBi ? validatePowerBi(powerBi) : []),
];
