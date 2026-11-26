/** Shapes of the JSON files in /customize. The JSON schemas in customize/schema mirror these. */

export type Look = 'hud' | 'comic';
export type ValueFormat = 'currency' | 'number' | 'percent';

export interface Palette {
  background: string;
  backgroundAlt: string;
  ink: string;
  dim: string;
  line: string;
  hot: string;
  sun: string;
  series: string[];
}

export interface BrandConfig {
  name: string;
  titleAccent?: string;
  tagline?: string;
  logo: string;
  mark: string;
  favicon?: string;
  defaultLook?: Look;
  allowLookToggle?: boolean;
  fonts?: { heading?: string; mono?: string; comic?: string; body?: string; stylesheet?: string };
  colors: Record<Look, Palette>;
  copy?: {
    lockOn?: string;
    hint?: string;
    lookLabels?: Partial<Record<Look, string>>;
    boot?: string[];
  };
  footer?: { text?: string; url?: string };
}

export interface SeriesConfig {
  id: string;
  label: string;
  short?: string;
  /** DAX scalar expression. */
  value: string;
  /** Optional DAX scalar expression for units. */
  units?: string;
}

export interface DimensionConfig {
  label: string;
  /** DAX column reference, e.g. 'DimDate'[CalendarYear]. */
  column: string;
}

export interface GeoDimensionConfig extends DimensionConfig {
  aliases?: Record<string, string>;
  coordinates?: Record<string, [number, number]>;
}

export interface CategoryDimensionConfig extends DimensionConfig {
  colorNames?: boolean;
}

export interface FilterDimensionConfig extends DimensionConfig {
  id: string;
}

export interface MeasureConfig {
  id: string;
  label: string;
  expression: string;
  format?: ValueFormat;
}

export interface ModelConfig {
  /** Matches the file name in customize/models/. */
  id: string;
  connector: string;
  modelName?: string;
  locale?: string;
  currency?: string;
  valueFormat?: ValueFormat;
  series: SeriesConfig[];
  dimensions: {
    time: DimensionConfig;
    geo?: GeoDimensionConfig;
    category?: CategoryDimensionConfig;
  };
  extraFilters?: FilterDimensionConfig[];
  detail?: { columns: DimensionConfig[]; maxRows?: number };
  extraMeasures?: MeasureConfig[];
}

export type ModuleId = 'core' | 'readouts' | 'globe' | 'targetList' | 'category' | 'trend' | 'insights';

export interface FeaturesConfig {
  modules?: Partial<Record<ModuleId, boolean>>;
  views?: { workbench?: boolean; report?: boolean };
  features?: Partial<Record<'filtersPane' | 'drillThrough' | 'savedViews' | 'visualBuilder' | 'bootSequence' | 'lockBurst', boolean>>;
  actions?: Partial<Record<'csv' | 'png' | 'copy' | 'teams' | 'email', boolean>>;
  shareUrl?: string;
}

export interface PowerBiConfig {
  /** Entra app registration (single-page app) client ID. */
  clientId: string;
  tenantId: string;
  syncFilters?: boolean;
  filterTargets?: Record<string, { table: string; column: string }>;
}

export type ProfileIcon =
  | 'chart' | 'shield' | 'cog' | 'users' | 'briefcase' | 'globe'
  | 'gauge' | 'dollar' | 'book' | 'sparkles' | 'truck' | 'heart';

interface ContentBase {
  id: string;
  title: string;
  description?: string;
  /** Where the content comes from, shown on the tile. */
  source?: string;
}

export interface DashboardItem extends ContentBase {
  type: 'dashboard';
  /** File name in customize/models/ without .json. */
  model: string;
}

export interface ReportItem extends ContentBase {
  type: 'report';
  /** Empty until someone sets it up: the tile then says "Setup needed". */
  workspaceId: string;
  reportId: string;
  pageName?: string;
}

export interface LinkItem extends ContentBase {
  type: 'link';
  url: string;
}

export type ContentItem = DashboardItem | ReportItem | LinkItem;

export interface ProfileSection {
  title: string;
  description?: string;
  items: ContentItem[];
}

export interface ProfileConfig {
  id: string;
  name: string;
  icon?: ProfileIcon;
  order?: number;
  description?: string;
  enabled?: boolean;
  sections: ProfileSection[];
}
