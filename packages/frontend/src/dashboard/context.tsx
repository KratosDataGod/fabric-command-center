import { createContext, useContext } from 'react';

import type { ModelConfig } from '@/config';
import type { Formatters } from '@/data/format';
import type { Dimension, FilterValue, Filters } from '@/state/filters';

export interface SeriesMeta {
  label: string;
  short: string;
  /** CSS colour, from the brand palette for the current look. */
  color: string;
}

export interface DashboardContextValue {
  model: ModelConfig;
  dims: Dimension[];
  series: SeriesMeta[];
  hasUnits: boolean;
  fmt: Formatters;
  filters: Filters;
  /** Click handling shared by every visual: plain click selects, Ctrl/Cmd/Shift adds. */
  select: (dimId: string, value: FilterValue, additive: boolean) => void;
  /** Opens drill-through for the current filters. */
  openDetail?: () => void;
}

export const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboard must be used inside a DashboardContext provider.');
  return ctx;
}

/** True when the click asked to add to the selection rather than replace it. */
export function isAdditive(e: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }): boolean {
  return Boolean(e.ctrlKey || e.metaKey || e.shiftKey);
}

export function isSelected(filters: Filters, dimId: string, value: FilterValue): boolean {
  return (filters[dimId] ?? []).some((v) => v === value);
}

export function hasSelection(filters: Filters, dimId: string): boolean {
  return (filters[dimId]?.length ?? 0) > 0;
}
