import type { ModelConfig } from '@/config';
import type { Dimension, FilterValue, Filters } from '@/state/filters';

/**
 * Builds every DAX query the app runs from model.json, so pointing the app at a
 * new semantic model is a config change, not a code change.
 * Result columns are read by position, never by name.
 */

export function literal(v: FilterValue): string {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error('Filter values must be finite numbers.');
    return String(v);
  }
  return `"${v.replace(/"/g, '""')}"`;
}

export function treatAs(column: string, values: FilterValue[]): string {
  return `TREATAS ( { ${values.map(literal).join(', ')} }, ${column} )`;
}

/** One TREATAS filter argument per active dimension, skipping `exclude`. */
export function filterArgs(filters: Filters, dims: Dimension[], exclude: string[] = []): string[] {
  return dims
    .filter((d) => !exclude.includes(d.id) && (filters[d.id]?.length ?? 0) > 0)
    .map((d) => treatAs(d.column, filters[d.id]!));
}

const wrap = (e: string) => `( ${e} )`;

/** Sum of every series' value expression. */
export function totalExpression(model: ModelConfig): string {
  return model.series.map((s) => wrap(s.value)).join(' + ');
}

/** "S0", expr, "S1", expr, ..., "T", total. Columns come back in that order. */
function seriesPairs(model: ModelConfig): string[] {
  return [...model.series.map((s, i) => `"S${i}", ${s.value}`), `"T", ${totalExpression(model)}`];
}

const withArgs = (head: string, args: string[]) => [head, ...args].join(',\n        ');

/**
 * KPI row. Columns: S0..Sn-1, then U0..Un-1 when every series has units.
 */
export function kpiQuery(model: ModelConfig, filters: Filters, dims: Dimension[]): string {
  const hasUnits = model.series.every((s) => s.units?.trim());
  const pairs = [
    ...model.series.map((s, i) => `"S${i}", ${s.value}`),
    ...(hasUnits ? model.series.map((s, i) => `"U${i}", ${s.units}`) : []),
  ];
  const row = `ROW (\n            ${pairs.join(',\n            ')}\n        )`;
  return `EVALUATE\nCALCULATETABLE (\n        ${withArgs(row, filterArgs(filters, dims))}\n)`;
}

export interface BreakdownOptions {
  /** Order by the dimension itself (time) or by total, largest first. */
  order: 'dimension' | 'total';
  topN?: number;
}

/** One row per dimension member. Columns: member, S0..Sn-1, T. Blank members are dropped. */
export function breakdownQuery(
  model: ModelConfig,
  dim: Dimension,
  filters: Filters,
  dims: Dimension[],
  opts: BreakdownOptions
): string {
  const args = [dim.column, ...filterArgs(filters, dims, [dim.id]), ...seriesPairs(model)];
  const summarize = `SUMMARIZECOLUMNS (\n        ${args.join(',\n        ')}\n    )`;
  const body = `FILTER (\n    ${summarize},\n    NOT ISBLANK ( ${dim.column} )\n)`;
  const top = opts.topN ? `TOPN ( ${opts.topN}, ${body}, [T], DESC )` : body;
  const orderBy = opts.order === 'dimension' ? `${dim.column} ASC` : '[T] DESC';
  return `EVALUATE\n${top}\nORDER BY ${orderBy}`;
}

/** Members of one dimension with their total, for the filters pane. Columns: member, T. */
export function valuesQuery(model: ModelConfig, dim: Dimension, filters: Filters, dims: Dimension[], limit = 500): string {
  const args = [dim.column, ...filterArgs(filters, dims, [dim.id]), `"T", ${totalExpression(model)}`];
  return `EVALUATE\nTOPN (\n    ${limit},\n    FILTER (\n        SUMMARIZECOLUMNS (\n            ${args.join(',\n            ')}\n        ),\n        NOT ISBLANK ( ${dim.column} )\n    ),\n    [T], DESC\n)\nORDER BY ${dim.role === 'time' ? `${dim.column} ASC` : '[T] DESC'}`;
}

/** Drill-through rows under the current filters. Columns: detail columns..., S0..Sn-1, T. */
export function detailQuery(model: ModelConfig, filters: Filters, dims: Dimension[]): string | undefined {
  const cols = model.detail?.columns ?? [];
  if (cols.length === 0) return undefined;
  const max = Math.min(Math.max(model.detail?.maxRows ?? 500, 10), 5000);
  const args = [...cols.map((c) => c.column), ...filterArgs(filters, dims), ...seriesPairs(model)];
  return `EVALUATE\nTOPN (\n    ${max},\n    SUMMARIZECOLUMNS (\n        ${args.join(',\n        ')}\n    ),\n    [T], DESC\n)\nORDER BY [T] DESC`;
}

/** A user-built visual: one measure by one dimension. Columns: member, V. */
export function builderQuery(dim: Dimension, expression: string, filters: Filters, dims: Dimension[], topN: number): string {
  const args = [dim.column, ...filterArgs(filters, dims, [dim.id]), `"V", ${expression}`];
  const body = `FILTER (\n    SUMMARIZECOLUMNS (\n        ${args.join(',\n        ')}\n    ),\n    NOT ISBLANK ( ${dim.column} ) && NOT ISBLANK ( [V] )\n)`;
  const n = Math.min(Math.max(Math.round(topN), 1), 100);
  return `EVALUATE\nTOPN ( ${n}, ${body}, [V], DESC )\nORDER BY ${dim.role === 'time' ? `${dim.column} ASC` : '[V] DESC'}`;
}
