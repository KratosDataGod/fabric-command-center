/**
 * Proposes a customize/models/*.json from a semantic model's own metadata
 * (INFO.VIEW.COLUMNS and INFO.VIEW.MEASURES), so a new company starts from a
 * working mapping instead of a blank file. Pure and dependency-free: the setup
 * script runs it under Node, the tests run it under Vitest.
 */
import type { ModelConfig } from './types';

export interface ModelColumn {
  table: string;
  name: string;
  dataType?: string;
}
export interface ModelMeasure {
  table: string;
  name: string;
}
export interface Proposal {
  model: ModelConfig;
  /** One line per choice, so people can see why and change it. */
  notes: string[];
}

const ref = (c: ModelColumn) => `'${c.table.replace(/'/g, "''")}'[${c.name.replace(/]/g, ']]')}]`;
const mref = (m: ModelMeasure) => `[${m.name.replace(/]/g, ']]')}]`;
const lc = (s: string) => s.toLowerCase().replace(/[\s_-]+/g, '');
const isNumeric = (c: ModelColumn) => /int|double|decimal|currency|number|fixed/i.test(c.dataType ?? '');
const isText = (c: ModelColumn) => !c.dataType || /string|text/i.test(c.dataType);

type Rule = { name: RegExp; table?: RegExp; score: number; test?: (c: ModelColumn) => boolean };

function best(columns: ModelColumn[], rules: Rule[]): ModelColumn | undefined {
  let pick: ModelColumn | undefined;
  let top = 0;
  for (const c of columns) {
    for (const r of rules) {
      if (!r.name.test(lc(c.name))) continue;
      if (r.table && !r.table.test(lc(c.table))) continue;
      if (r.test && !r.test(c)) continue;
      if (r.score > top) {
        top = r.score;
        pick = c;
      }
    }
  }
  return pick;
}

const DATE_TABLE = /date|calendar|time|period/;

export function proposeModel(columns: ModelColumn[], measures: ModelMeasure[], opts: { id?: string; connector?: string; modelName?: string } = {}): Proposal {
  const notes: string[] = [];
  const visible = columns.filter((c) => !/^rownumber/i.test(c.name));

  const time =
    best(visible, [
      { name: /^calendaryear$/, score: 10 },
      { name: /^year$/, table: DATE_TABLE, score: 9 },
      { name: /^fiscalyear$/, score: 7 },
      { name: /year$/, table: DATE_TABLE, score: 6 },
      { name: /^year$/, score: 5 },
      { name: /year/, score: 3 },
      { name: /^(month|yearmonth|monthyear)$/, table: DATE_TABLE, score: 2 },
    ]) ?? undefined;
  notes.push(time ? `Time: ${ref(time)}` : 'Time: no year column found. Set dimensions.time by hand.');

  const geo = best(visible.filter(isText), [
    { name: /^(country|countryregion|countryname|salesterritorycountry|englishcountryregionname)$/, score: 10 },
    { name: /country/, score: 8 },
    { name: /^(nation|market)$/, score: 5 },
    { name: /^(region|territory|salesterritoryregion)$/, score: 3 },
  ]);
  notes.push(geo ? `Geo: ${ref(geo)}${/country|nation/.test(lc(geo.name)) ? '' : ' (not a country column: the globe will list names it cannot place)'}` : 'Geo: no country column found. The globe and target list are hidden.');

  const category = best(
    visible.filter(isText).filter((c) => c !== geo),
    [
      { name: /^(productcategory|category|englishproductcategoryname|categoryname)$/, score: 10 },
      { name: /category$/, score: 8 },
      { name: /^(segment|channel|department|productline|brand|type)$/, score: 6 },
      { name: /^(color|colour)$/, score: 4 },
      { name: /subcategory/, score: 3 },
    ]
  );
  notes.push(category ? `Category: ${ref(category)}` : 'Category: none found. The bubble chart is hidden.');

  const extra = best(
    visible.filter(isText).filter((c) => c !== geo && c !== category),
    [
      { name: /^(region|salesterritoryregion|state|stateprovincename|province)$/, score: 6 },
      { name: /^(city)$/, score: 3 },
    ]
  );

  // Series: prefer real measures about money; fall back to summing a fact column.
  const salesLike = /(sales|revenue|amount|turnover|value|total|cost|profit|margin|spend)/;
  const ranked = measures
    .map((m) => ({ m, s: (salesLike.test(lc(m.name)) ? 5 : 0) + (/(ytd|ly|py|yoy|%|pct|percent|ratio|rank|count)/.test(lc(m.name)) ? -6 : 0) }))
    .sort((a, b) => b.s - a.s);
  let series: ModelConfig['series'] = ranked
    .filter((r) => r.s > 0)
    .slice(0, 2)
    .map(({ m }, i) => ({ id: `s${i + 1}`, label: m.name, short: m.name.slice(0, 8).toUpperCase(), value: mref(m) }));
  if (!series.length) {
    const amounts = visible.filter(isNumeric).filter((c) => /(salesamount|amount|sales|revenue|extendedamount)$/.test(lc(c.name)) && !DATE_TABLE.test(lc(c.table)));
    series = amounts.slice(0, 2).map((c, i) => ({ id: `s${i + 1}`, label: c.table.replace(/^fact/i, '') || c.name, short: (c.table.replace(/^fact/i, '') || c.name).slice(0, 8).toUpperCase(), value: `SUM ( ${ref(c)} )` }));
  }
  if (!series.length && measures[0]) series = [{ id: 's1', label: measures[0].name, short: measures[0].name.slice(0, 8).toUpperCase(), value: mref(measures[0]) }];
  notes.push(series.length ? `Series: ${series.map((s) => `${s.label} = ${s.value}`).join('; ')}` : 'Series: no measure found. Add at least one series by hand.');

  const units = measures.find((m) => /(quantity|units|orderqty|qty)/.test(lc(m.name)));
  const detailName = best(visible.filter(isText), [
    { name: /^(englishproductname|productname|product)$/, score: 10 },
    { name: /^(customername|customer)$/, score: 6 },
    { name: /name$/, score: 3 },
  ]);

  const model: ModelConfig = {
    id: opts.id ?? 'sales',
    connector: opts.connector ?? 'salesmodel',
    ...(opts.modelName ? { modelName: opts.modelName } : {}),
    locale: 'en-US',
    currency: 'USD',
    valueFormat: series.some((s) => /amount|sales|revenue|cost|profit|spend/i.test(s.value + s.label)) ? 'currency' : 'number',
    series,
    dimensions: {
      time: time ? { label: /fiscal/i.test(time.name) ? 'Fiscal year' : 'Year', column: ref(time) } : { label: 'Year', column: "'Date'[Year]" },
      ...(geo ? { geo: { label: /country|nation/.test(lc(geo.name)) ? 'Country' : geo.name, column: ref(geo) } } : {}),
      ...(category ? { category: { label: category.name.replace(/^English/, ''), column: ref(category), ...(/colou?r/.test(lc(category.name)) ? { colorNames: true } : {}) } } : {}),
    },
    ...(extra ? { extraFilters: [{ id: 'extra1', label: extra.name.replace(/^SalesTerritory/, ''), column: ref(extra) }] } : {}),
    ...(detailName ? { detail: { columns: [{ label: detailName.name.replace(/^English/, ''), column: ref(detailName) }, ...(category ? [{ label: category.name.replace(/^English/, ''), column: ref(category) }] : [])], maxRows: 500 } } : {}),
    ...(units ? { extraMeasures: [{ id: 'units', label: units.name, expression: mref(units), format: 'number' as const }] } : {}),
  };
  if (units) notes.push(`Workbench extra measure: ${units.name}`);
  return { model, notes };
}

/** Rows from `rayfin connector invoke --json` for INFO.VIEW queries, with "[Name]" style keys normalised to "Name". */
export function rowsFromInvoke(payload: unknown): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const walk = (x: unknown): boolean => {
    if (Array.isArray(x)) {
      if (x.length && x.every((r) => r && typeof r === 'object' && !Array.isArray(r))) {
        const sample = x[0] as Record<string, unknown>;
        if (Object.values(sample).every((v) => v === null || typeof v !== 'object')) {
          for (const r of x as Record<string, unknown>[]) {
            found.push(Object.fromEntries(Object.entries(r).map(([k, v]) => [k.replace(/^.*\[|\]$/g, ''), v])));
          }
          return true;
        }
      }
      return x.some(walk);
    }
    if (x && typeof x === 'object') return Object.values(x).some(walk);
    return false;
  };
  walk(payload);
  return found;
}
