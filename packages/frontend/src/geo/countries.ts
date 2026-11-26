import { geoArea, geoCentroid } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countriesTopo from 'world-atlas/countries-110m.json';

type LonLat = [number, number];

/** Common spellings in business data → world-atlas names. Keys are normalised (see norm). */
const ALIASES: Record<string, string> = {
  'united states': 'United States of America',
  usa: 'United States of America',
  us: 'United States of America',
  'u s': 'United States of America',
  'u s a': 'United States of America',
  america: 'United States of America',
  uk: 'United Kingdom',
  'great britain': 'United Kingdom',
  britain: 'United Kingdom',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  'northern ireland': 'United Kingdom',
  'czech republic': 'Czechia',
  korea: 'South Korea',
  'republic of korea': 'South Korea',
  'korea republic of': 'South Korea',
  'russian federation': 'Russia',
  'bosnia and herzegovina': 'Bosnia and Herz.',
  'central african republic': 'Central African Rep.',
  'democratic republic of the congo': 'Dem. Rep. Congo',
  drc: 'Dem. Rep. Congo',
  'congo drc': 'Dem. Rep. Congo',
  'republic of the congo': 'Congo',
  'dominican republic': 'Dominican Rep.',
  'equatorial guinea': 'Eq. Guinea',
  'north macedonia': 'Macedonia',
  'south sudan': 'S. Sudan',
  'ivory coast': "Côte d'Ivoire",
  'cote d ivoire': "Côte d'Ivoire",
  eswatini: 'eSwatini',
  swaziland: 'eSwatini',
  'solomon islands': 'Solomon Is.',
  'falkland islands': 'Falkland Is.',
  'western sahara': 'W. Sahara',
  holland: 'Netherlands',
  'the netherlands': 'Netherlands',
  uae: 'United Arab Emirates',
  'viet nam': 'Vietnam',
  turkiye: 'Turkey',
  'lao pdr': 'Laos',
  burma: 'Myanmar',
  'iran islamic republic of': 'Iran',
  'syrian arab republic': 'Syria',
  'east timor': 'Timor-Leste',
  'trinidad tobago': 'Trinidad and Tobago',
};

/** Countries too small for the 110m map. [longitude, latitude]. */
const SMALL: Record<string, LonLat> = {
  singapore: [103.82, 1.35],
  'hong kong': [114.17, 22.32],
  macau: [113.55, 22.2],
  malta: [14.38, 35.94],
  bahrain: [50.56, 26.07],
  andorra: [1.52, 42.51],
  liechtenstein: [9.55, 47.17],
  monaco: [7.42, 43.74],
  'san marino': [12.46, 43.94],
  mauritius: [57.55, -20.35],
  barbados: [-59.54, 13.19],
  maldives: [73.22, 3.2],
  seychelles: [55.49, -4.68],
  bermuda: [-64.75, 32.31],
};

/** Lowercase, strip accents and punctuation, collapse spaces. */
export function norm(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

let centroids: Map<string, LonLat> | undefined;

/** Centre of each country's largest landmass, so overseas territories don't drag it out to sea. */
function build(): Map<string, LonLat> {
  const topo = countriesTopo as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const fc = feature(topo, topo.objects.countries);
  const map = new Map<string, LonLat>();
  for (const f of fc.features as Feature<Polygon | MultiPolygon, { name: string }>[]) {
    let target: Feature<Polygon | MultiPolygon> = f;
    if (f.geometry?.type === 'MultiPolygon') {
      let best = -1;
      for (const coords of f.geometry.coordinates) {
        const poly: Feature<Polygon> = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: coords } };
        const a = geoArea(poly);
        if (a > best) {
          best = a;
          target = poly;
        }
      }
    }
    if (f.geometry) map.set(norm(f.properties.name), geoCentroid(target) as LonLat);
  }
  return map;
}

/**
 * Where to draw a country, or undefined if it can't be placed.
 * `overrides` and `aliases` come from the model's geo dimension config.
 */
export function locate(
  name: string,
  overrides?: Record<string, [number, number]>,
  aliases?: Record<string, string>
): LonLat | undefined {
  if (overrides?.[name]) return overrides[name];
  centroids ??= build();
  const n = norm(aliases?.[name] ?? name);
  return centroids.get(n) ?? centroids.get(norm(ALIASES[n] ?? '')) ?? SMALL[n];
}
