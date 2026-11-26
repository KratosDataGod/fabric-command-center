/** One dimension member with a value per series (in model.json order) and their total. */
export interface SplitRow {
  key: string | number;
  values: number[];
  total: number;
}

export interface Kpis {
  values: number[];
  total: number;
  /** Per-series units, when every series declares a units expression. */
  units?: number[];
  unitsTotal?: number;
}

export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** Rows shaped [member, S0..Sn-1, T] from breakdownQuery. Blank members are dropped. */
export function toSplitRows(rows: unknown[][] | undefined, seriesCount: number): SplitRow[] | undefined {
  if (!rows) return undefined;
  return rows
    .filter((r) => r[0] !== null && r[0] !== undefined && r[0] !== '')
    .map((r) => {
      const values = Array.from({ length: seriesCount }, (_, i) => num(r[i + 1]));
      return { key: r[0] as string | number, values, total: values.reduce((a, b) => a + b, 0) };
    });
}

/** The single row from kpiQuery: S0..Sn-1 then optional U0..Un-1. */
export function toKpis(rows: unknown[][] | undefined, seriesCount: number, hasUnits: boolean): Kpis | undefined {
  const r = rows?.[0];
  if (!r) return undefined;
  const values = Array.from({ length: seriesCount }, (_, i) => num(r[i]));
  const k: Kpis = { values, total: values.reduce((a, b) => a + b, 0) };
  if (hasUnits) {
    k.units = Array.from({ length: seriesCount }, (_, i) => num(r[seriesCount + i]));
    k.unitsTotal = k.units.reduce((a, b) => a + b, 0);
  }
  return k;
}

/** CSV with a header row; quotes every text cell that needs it. */
export function toCsv(header: string[], rows: unknown[][]): string {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    // Guard against spreadsheet formula injection from model data.
    const safe = /^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s)) ? `'${s}` : s;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}
