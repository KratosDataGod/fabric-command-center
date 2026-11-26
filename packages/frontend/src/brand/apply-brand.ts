import { brand, brandAsset, type Look, type Palette } from '@/config';

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
export function brandCssVariables(): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const look of ['hud', 'comic'] as Look[]) {
    const p = brand.colors[look];
    for (const [key, name] of KEYS) vars[`--fcc-${look}-${name}`] = p[key];
    for (let i = 0; i < 4; i++) vars[`--fcc-${look}-s${i}`] = p.series[i] ?? p.series[i % p.series.length];
  }
  const f = brand.fonts ?? {};
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

  const sheet = brand.fonts?.stylesheet;
  if (sheet && /^https:\/\//.test(sheet) && !document.querySelector(`link[data-fcc-fonts]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = sheet;
    link.dataset.fccFonts = 'true';
    document.head.appendChild(link);
  }
}
