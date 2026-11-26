import { brand, brandAsset, type BrandConfig, type Look, type Palette } from '@/config';

const KEYS: [keyof Omit<Palette, 'series'>, string][] = [
  ['background', 'background'],
  ['backgroundAlt', 'background-alt'],
  ['ink', 'ink'],
  ['dim', 'dim'],
  ['line', 'line'],
  ['hot', 'hot'],
  ['sun', 'sun'],
];

/** CSS custom properties for both looks, from customize/brand/brand.json. */
export function brandCssVariables(b: BrandConfig = brand): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const look of ['hud', 'comic'] as Look[]) {
    const p = b.colors[look];
    for (const [key, name] of KEYS) vars[`--fcc-${look}-${name}`] = p[key];
    for (let i = 0; i < 4; i++) vars[`--fcc-${look}-s${i}`] = p.series[i] ?? p.series[i % p.series.length];
  }
  const f = b.fonts ?? {};
  if (f.heading) vars['--fcc-font-heading'] = `'${f.heading}'`;
  if (f.mono) vars['--fcc-font-mono'] = `'${f.mono}'`;
  if (f.comic) vars['--fcc-font-comic'] = `'${f.comic}'`;
  if (f.body) vars['--fcc-font-body'] = `'${f.body}'`;
  return vars;
}

const LOOK_KEY = 'fcc.look';

/** The look to start in: the viewer's last choice, else the brand default. */
export function initialLook(): Look {
  try {
    const saved = localStorage.getItem(LOOK_KEY);
    if (saved === 'hud' || saved === 'comic') return saved;
  } catch {
    // Storage can be blocked inside iframes; fall back to the brand default.
  }
  return brand.defaultLook ?? 'hud';
}

export function rememberLook(look: Look) {
  try {
    localStorage.setItem(LOOK_KEY, look);
  } catch {
    // Not fatal: the look just won't persist.
  }
}

/** Applies the brand to the document before React renders. */
export function applyBrand() {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(brandCssVariables())) root.style.setProperty(k, v);
  root.setAttribute('data-theme', initialLook() === 'hud' ? 'dark' : 'light');
  document.title = [brand.name, brand.titleAccent?.replace(/^\/\/\s*/, '')].filter(Boolean).join(' · ');

  const icon = brandAsset(brand.favicon ?? brand.mark);
  if (icon) {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = icon;
  }

  loadFontStylesheet(brand.fonts?.stylesheet);
}

/** Adds (or swaps) the brand's font stylesheet. Only https URLs are used. */
export function loadFontStylesheet(sheet: string | undefined) {
  if (!sheet || !/^https:\/\//.test(sheet)) return;
  let link = document.querySelector<HTMLLinkElement>('link[data-fcc-fonts]');
  if (link?.href === sheet) return;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'stylesheet';
    link.dataset.fccFonts = 'true';
    document.head.appendChild(link);
  }
  link.href = sheet;
}

/** Applies colours and fonts from a brand object (used live by the demo Brand Studio). */
export function applyBrandStyles(b: BrandConfig) {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(brandCssVariables(b))) root.style.setProperty(k, v);
  loadFontStylesheet(b.fonts?.stylesheet);
}
