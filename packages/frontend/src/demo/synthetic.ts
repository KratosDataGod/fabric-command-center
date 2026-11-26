/**
 * Synthetic data for `npm run demo`: answers the app's own generated DAX with
 * made-up, deterministic numbers so anyone can try the app without a model.
 * Never used in a Fabric build.
 */

const MEMBERS: Record<string, (string | number)[]> = {
  "'DimDate'[CalendarYear]": [2021, 2022, 2023, 2024, 2025],
  "'DimSalesTerritory'[SalesTerritoryCountry]": ['United States', 'Australia', 'United Kingdom', 'Germany', 'France', 'Canada', 'Japan', 'Brazil'],
  "'DimSalesTerritory'[SalesTerritoryRegion]": ['North', 'South', 'East', 'West', 'Central', 'Pacific'],
  "'DimProduct'[Color]": ['Black', 'Red', 'Silver', 'Yellow', 'Blue', 'White', 'Grey', 'Multi'],
  "'DimProduct'[EnglishProductName]": Array.from({ length: 24 }, (_, i) => `${['Road', 'Mountain', 'Touring', 'City'][i % 4]} Bike ${100 + i * 50}`),
};

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}

export function membersOf(column: string): (string | number)[] {
  return MEMBERS[column] ?? Array.from({ length: 8 }, (_, i) => `${column.match(/\[(.+)\]/)?.[1] ?? 'Item'} ${i + 1}`);
}

/** A member's share of its column's total, stable across queries. */
function share(column: string, value: string | number): number {
  const all = membersOf(column);
  // Years grow over time; everything else gets a stable, uneven share.
  const weight = (v: string | number) => (typeof v === 'number' && v > 1900 ? 0.7 + (v - 2021) * 0.18 + hash(`${column}|${v}`) * 0.1 : 0.25 + hash(`${column}|${v}`));
  const total = all.reduce<number>((a, v) => a + weight(v), 0);
  return all.some((v) => v === value) ? weight(value) / total : 0;
}

/** Top-level comma split that respects brackets, braces, parentheses and quotes. */
function splitArgs(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  let quote: string | null = null;
  for (const ch of text) {
    if (quote) {
      cur += ch;
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    if (ch === ',' && depth === 0) {
      out.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function innerOf(query: string, fn: string): string | undefined {
  const start = query.indexOf(`${fn} (`);
  if (start < 0) return undefined;
  let depth = 0;
  for (let i = query.indexOf('(', start); i < query.length; i++) {
    if (query[i] === '(') depth++;
    else if (query[i] === ')' && --depth === 0) return query.slice(query.indexOf('(', start) + 1, i);
  }
  return undefined;
}

const COLUMN = /^'[^']+'\[[^\]]+\]$/;

function parseTreatAs(arg: string): { column: string; values: (string | number)[] } | undefined {
  const m = arg.match(/^TREATAS\s*\(\s*\{(.*)\}\s*,\s*('[^']+'\[[^\]]+\])\s*\)$/s);
  if (!m) return undefined;
  const values = splitArgs(m[1]!).map((v) => (v.startsWith('"') ? v.slice(1, -1).replace(/""/g, '"') : Number(v)));
  return { column: m[2]!, values };
}

/** Rows for one of the app's generated queries (see src/dax/builder.ts). */
export function answer(query: string): unknown[][] {
  const row = innerOf(query, 'ROW');
  const sc = innerOf(query, 'SUMMARIZECOLUMNS');
  const args = splitArgs(row ? innerOf(query, 'CALCULATETABLE') ?? '' : sc ?? '');
  const filters = args.map(parseTreatAs).filter(Boolean) as { column: string; values: (string | number)[] }[];
  const groups = row ? [] : args.filter((a) => COLUMN.test(a));
  const pairs = splitArgs(row ?? '').concat(row ? [] : args.filter((a) => /^"[A-Z]\d*"$/.test(a)));
  const names = (row ? pairs.filter((_, i) => i % 2 === 0) : pairs).map((n) => n.replace(/"/g, ''));

  let factor = 1;
  for (const f of filters) if (!groups.includes(f.column)) factor *= f.values.reduce<number>((a, v) => a + share(f.column, v), 0);

  const lists = groups.map((g) => {
    const f = filters.find((x) => x.column === g);
    return membersOf(g).filter((v) => !f || f.values.includes(v));
  });
  const combos: (string | number)[][] = lists.reduce<(string | number)[][]>((acc, list) => acc.flatMap((c) => list.map((v): (string | number)[] => [...c, v])), [[]]).slice(0, 2000);
  const seriesCount = names.filter((n) => /^S\d$/.test(n)).length || 1;

  const rows = combos.map((combo) => {
    let base = 42_000_000 * factor;
    combo.forEach((v, i) => {
      base *= share(groups[i]!, v);
    });
    const key = combo.join('|');
    const first = seriesCount > 1 ? 0.34 + hash(`${key}#a`) * 0.3 : 1;
    const s = Array.from({ length: seriesCount }, (_, i) => base * (i === 0 ? first : (1 - first) / (seriesCount - 1)));
    const values = names.map((n) => {
      if (/^S\d$/.test(n)) return s[Number(n.slice(1))] ?? 0;
      if (/^U\d$/.test(n)) return Math.round((s[Number(n.slice(1))] ?? 0) / (380 + hash(`${key}#u${n}`) * 900));
      if (n === 'T') return base;
      return base;
    });
    return [...combo, ...values];
  });

  if (row) return rows.slice(0, 1);
  const top = query.match(/TOPN\s*\(\s*(\d+)/);
  const byColumn = /ORDER BY '[^']+'\[[^\]]+\] ASC/.test(query);
  const sorted = byColumn ? rows.sort((a, b) => (a[0]! < b[0]! ? -1 : 1)) : rows.sort((a, b) => Number(b[b.length - 1]) - Number(a[a.length - 1]));
  return top ? sorted.slice(0, Number(top[1])) : sorted;
}
