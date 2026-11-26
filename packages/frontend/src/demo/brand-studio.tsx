import { Check, Copy, Download, Palette as PaletteIcon, RotateCcw, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { applyBrandStyles } from '@/brand/apply-brand';
import { brand, type BrandConfig, type Look, type Palette } from '@/config';
import { brandContrastWarnings, contrastRatio } from '@/config/validate';
import { copyText } from '@/features/actions';

import { googleFontsUrl } from './fonts';

/** Brand packs that ship in customize/brands/, as starting points. */
const PACKS = Object.fromEntries(
  Object.entries(import.meta.glob<{ default: BrandConfig }>('@customize/brands/*/brand.json', { eager: true })).map(([path, mod]) => [
    path.split('/').at(-2)!,
    mod.default,
  ])
);

const SLOTS: { key: keyof Omit<Palette, 'series'>; label: string; hint: string }[] = [
  { key: 'background', label: 'Background', hint: 'Page' },
  { key: 'backgroundAlt', label: 'Background 2', hint: 'Gradient end' },
  { key: 'ink', label: 'Text', hint: '4.5:1 or more' },
  { key: 'dim', label: 'Secondary text', hint: '4.5:1 or more' },
  { key: 'line', label: 'Lines', hint: 'Borders, grid' },
  { key: 'hot', label: 'Selection', hint: 'Locks, falls' },
  { key: 'sun', label: 'Highlight', hint: 'Focus rings' },
];

const FONTS = {
  heading: ['Chakra Petch', 'Orbitron', 'Rajdhani', 'Oxanium', 'Montserrat', 'Poppins', 'Inter', 'Segoe UI'],
  body: ['IBM Plex Sans', 'Inter', 'Source Sans 3', 'Open Sans', 'Roboto', 'Lato', 'Segoe UI'],
  mono: ['JetBrains Mono', 'IBM Plex Mono', 'Fira Code', 'Roboto Mono', 'Source Code Pro', 'Consolas'],
  comic: ['Bangers', 'Luckiest Guy', 'Bowlby One', 'Anton', 'Bebas Neue'],
} as const;
const clone = (b: BrandConfig) => structuredClone(b);

function Swatch({ label, hint, value, onChange, against }: { label: string; hint: string; value: string; onChange: (v: string) => void; against?: string }) {
  const ratio = against ? contrastRatio(value, against) : undefined;
  // Local text so a half-typed hex code can sit in the box; it applies once it is valid.
  const [text, setText] = useState(value);
  const [shown, setShown] = useState(value);
  if (shown !== value) {
    setShown(value);
    setText(value);
  }
  return (
    <label className="hud-studio-swatch">
      <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} colour`} />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        <span className="hud-hint block truncate">{hint}</span>
      </span>
      <input className="hud-input hud-studio-hex" value={text} maxLength={7} aria-label={`${label} hex`} spellCheck={false}
        aria-invalid={!/^#[0-9a-f]{6}$/i.test(text)}
        onChange={(e) => {
          setText(e.target.value);
          if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase());
        }} />
      {ratio !== undefined ? (
        <span className={`hud-mono hud-studio-ratio ${ratio < 4.5 ? 'is-low' : ''}`} title="Contrast against the background">
          {ratio.toFixed(1)}
        </span>
      ) : null}
    </label>
  );
}

/**
 * Demo-only Brand Studio: restyles the running app as you edit, checks
 * contrast, and downloads a brand.json to drop into customize/brand/.
 */
export function BrandStudio({ look, onClose }: { look: Look; onClose: () => void }) {
  const [draft, setDraft] = useState<BrandConfig>(() => clone(brand));
  const [tab, setTab] = useState<Look>(look);
  const [copied, setCopied] = useState(false);
  const warnings = useMemo(() => brandContrastWarnings(draft), [draft]);

  useEffect(() => applyBrandStyles(draft), [draft]);
  useEffect(() => () => applyBrandStyles(brand), []);

  const set = (fn: (b: BrandConfig) => void) =>
    setDraft((d) => {
      const n = clone(d);
      fn(n);
      if (n.fonts) n.fonts.stylesheet = googleFontsUrl(n.fonts);
      return n;
    });
  const palette = draft.colors[tab];
  const json = `${JSON.stringify({ $schema: '../schema/brand.schema.json', ...draft }, null, 2)}\n`;

  const download = () => {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: 'brand.json' });
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <aside className="hud-studio" aria-label="Brand Studio">
      <header className="hud-drawer-head">
        <h2 className="hud-title flex items-center gap-200"><PaletteIcon className="icon-size-200" aria-hidden /> Brand Studio</h2>
        <button type="button" className="hud-icon-btn" onClick={onClose} aria-label="Close Brand Studio"><X className="icon-size-200" aria-hidden /></button>
      </header>
      <div className="hud-drawer-body">
        <p className="hud-hint">Changes apply to the app behind this panel as you type. Download brand.json and put it in customize/brand/ with your logos.</p>

        <section className="hud-filter" aria-label="Start from">
          <p className="hud-label">Start from</p>
          <div className="flex flex-wrap gap-200">
            {Object.entries(PACKS).map(([id, b]) => (
              <button key={id} type="button" className="hud-btn" onClick={() => setDraft(clone(b))}>{id}</button>
            ))}
            <button type="button" className="hud-btn" onClick={() => setDraft(clone(brand))}><RotateCcw className="icon-size-200" aria-hidden /> Current</button>
          </div>
        </section>

        <section className="hud-filter" aria-label="Name">
          <p className="hud-label">Name</p>
          <label className="flex flex-col gap-100"><span className="hud-hint">Title</span>
            <input className="hud-input" value={draft.name} maxLength={40} onChange={(e) => set((b) => void (b.name = e.target.value))} /></label>
          <label className="flex flex-col gap-100"><span className="hud-hint">Accent</span>
            <input className="hud-input" value={draft.titleAccent ?? ''} maxLength={40} onChange={(e) => set((b) => void (b.titleAccent = e.target.value))} /></label>
          <label className="flex flex-col gap-100"><span className="hud-hint">Lock-on text</span>
            <input className="hud-input" value={draft.copy?.lockOn ?? ''} maxLength={24} onChange={(e) => set((b) => void (b.copy = { ...b.copy, lockOn: e.target.value }))} /></label>
          <p className="hud-hint">Name and text changes show after you download and redeploy; colours and fonts show now.</p>
        </section>

        <section className="hud-filter" aria-label="Colours">
          <div className="hud-tabs" role="tablist" aria-label="Look">
            {(['hud', 'comic'] as Look[]).map((l) => (
              <button key={l} type="button" role="tab" aria-selected={tab === l} className="hud-tab" onClick={() => setTab(l)}>
                {l === 'hud' ? 'Dark (HUD)' : 'Light (comic)'}
              </button>
            ))}
          </div>
          {tab !== look ? <p className="hud-hint">Switch the app to the {tab === 'hud' ? 'dark' : 'light'} look to see these colours.</p> : null}
          {SLOTS.map((s) => (
            <Swatch key={s.key} label={s.label} hint={s.hint} value={palette[s.key]} against={['ink', 'dim', 'hot'].includes(s.key) ? palette.backgroundAlt : undefined}
              onChange={(v) => set((b) => void (b.colors[tab][s.key] = v))} />
          ))}
          <p className="hud-label">Series</p>
          {palette.series.map((c, i) => (
            <Swatch key={i} label={`Series ${i + 1}`} hint="Also used for small labels" value={c} against={palette.backgroundAlt}
              onChange={(v) => set((b) => void (b.colors[tab].series[i] = v))} />
          ))}
        </section>

        <section className="hud-filter" aria-label="Fonts">
          <p className="hud-label">Fonts</p>
          {(Object.keys(FONTS) as (keyof typeof FONTS)[]).map((k) => (
            <label key={k} className="flex flex-col gap-100"><span className="hud-hint">{k[0]!.toUpperCase() + k.slice(1)}</span>
              <select className="hud-input" value={draft.fonts?.[k] ?? ''} onChange={(e) => set((b) => void (b.fonts = { ...b.fonts, [k]: e.target.value }))}>
                {[...new Set([draft.fonts?.[k], ...FONTS[k]].filter(Boolean))].map((f) => <option key={f}>{f}</option>)}
              </select></label>
          ))}
        </section>

        <section className="hud-filter" aria-label="Readability" aria-live="polite">
          <p className="hud-label">Readability</p>
          {warnings.length === 0 ? (
            <p className="flex items-center gap-200"><Check className="icon-size-200" aria-hidden /> Every text colour meets WCAG AA in both looks.</p>
          ) : (
            <ul className="hud-problems">{warnings.map((w) => <li key={w}>{w.replace('brand.json: ', '')}</li>)}</ul>
          )}
        </section>

        <div className="flex flex-wrap gap-200">
          <button type="button" className="hud-btn" onClick={download}><Download className="icon-size-200" aria-hidden /> Download brand.json</button>
          <button type="button" className="hud-btn" onClick={async () => { setCopied(await copyText(json)); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? <Check className="icon-size-200" aria-hidden /> : <Copy className="icon-size-200" aria-hidden />} {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
      </div>
    </aside>
  );
}
