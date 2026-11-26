#!/usr/bin/env node
/**
 * Fabric Command Center setup: brand, semantic model and model mapping in one go.
 *
 *   npm run setup
 *   npm run setup -- --name "Contoso" --model-url "<semantic model address>" --yes
 *
 * Steps (each can be skipped):
 *   1. Brand: a new brand pack in customize/brands/<slug>/ with your name and
 *      colours, made the active brand.
 *   2. Model: writes the workspace and item IDs to rayfin/.env.
 *   3. Mapping: reads the model's columns and measures (needs `npx rayfin login`)
 *      and proposes customize/models/<id>.json.
 *   4. Doctor: checks everything and runs every query.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';

import { bad, custom, GUID, invoke, ok, paint, parseModelUrl, readEnv, root, src, warn, writeEnv } from './lib/fcc.mjs';

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : undefined;
};
const yes = argv.includes('--yes') || !process.stdin.isTTY;
const rl = createInterface({ input: process.stdin, output: process.stdout });
async function ask(question, fallback = '') {
  if (yes) return fallback;
  const a = (await rl.question(`${paint(36, '?')} ${question}${fallback ? paint(90, ` (${fallback})`) : ''} `)).trim();
  return a || fallback;
}
const confirm = async (q, def = true) => /^y/i.test(await ask(`${q} [${def ? 'Y/n' : 'y/N'}]`, def ? 'y' : 'n'));
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, o) => writeFileSync(p, `${JSON.stringify(o, null, 2)}\n`);
const v = await import(join(src, 'config', 'validate.ts'));
const { proposeModel, rowsFromInvoke } = await import(join(src, 'config', 'propose-model.ts'));

console.log(paint(1, '\nFabric Command Center setup\n'));

// ---------- 1. Brand ----------
const HEX = /^#[0-9a-f]{6}$/i;
function darkenFor(color, background, min = 4.6) {
  let c = color;
  for (let k = 1; v.contrastRatio(c, background) < min && k > 0.2; k -= 0.04) {
    c = `#${[1, 3, 5].map((i) => Math.round(parseInt(color.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('')}`;
  }
  return c;
}
function lightenFor(color, background, min = 4.6) {
  let c = color;
  for (let k = 0; v.contrastRatio(c, background) < min && k < 0.9; k += 0.05) {
    c = `#${[1, 3, 5].map((i) => { const x = parseInt(color.slice(i, i + 2), 16); return Math.round(x + (255 - x) * k).toString(16).padStart(2, '0'); }).join('')}`;
  }
  return c;
}

const name = flag('name') ?? (await ask('Company or app name (blank to keep the current brand):', ''));
if (name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'company';
  const accent = flag('accent') ?? (await ask('Accent title text:', '// Command Center'));
  const primary = flag('primary') ?? (await ask('Primary brand colour (#rrggbb, blank for default):', ''));
  const secondary = flag('secondary') ?? (await ask('Secondary brand colour (#rrggbb, blank for default):', ''));
  const base = readJson(join(custom, 'brands', 'default', 'brand.json'));
  const brand = structuredClone(base);
  brand.name = name;
  brand.titleAccent = accent;
  brand.copy = { ...brand.copy, boot: [`${name.toUpperCase()} COMMAND CENTER ...... ONLINE`, ...(base.copy?.boot ?? []).slice(1)] };
  for (const [i, c] of [primary, secondary].entries()) {
    if (!c) continue;
    if (!HEX.test(c)) {
      warn(`"${c}" is not a #rrggbb colour; keeping the default.`);
      continue;
    }
    // Same hue in both looks, nudged until it is readable as text on each background.
    brand.colors.hud.series[i] = lightenFor(c, brand.colors.hud.backgroundAlt);
    brand.colors.comic.series[i] = darkenFor(c, brand.colors.comic.backgroundAlt);
  }
  const dir = join(custom, 'brands', slug);
  if (existsSync(dir) && !(await confirm(`customize/brands/${slug} exists. Overwrite?`, false))) {
    warn('Brand left as it was.');
  } else {
    mkdirSync(dir, { recursive: true });
    for (const f of readdirSync(join(custom, 'brands', 'default'))) if (f !== 'brand.json') copyFileSync(join(custom, 'brands', 'default', f), join(dir, f));
    writeJson(join(dir, 'brand.json'), brand);
    spawnSync(process.execPath, [join(root, 'scripts', 'fcc-brand.mjs'), slug], { stdio: 'inherit' });
    for (const w of v.brandContrastWarnings(brand)) warn(w);
    ok(`Brand "${name}" created. Replace customize/brand/logo.svg and mark.svg with your logos.`);
  }
}

// ---------- 2. Model ----------
const env = readEnv();
const urlArg = flag('model-url');
let ids = urlArg ? parseModelUrl(urlArg) : undefined;
if (!ids) {
  const current = env.FCC_MODEL_WORKSPACE_ID && env.FCC_MODEL_ITEM_ID ? 'keep current' : '';
  const answer = await ask("Paste the semantic model's address from Fabric (blank to skip):", current);
  if (answer && answer !== 'keep current') {
    ids = parseModelUrl(answer);
    if (!ids) bad('That address has no /groups/<workspace>/(datasets|semanticmodels|modeling)/<model> part. Skipping.');
  }
}
if (ids && GUID.test(ids.workspaceId) && GUID.test(ids.itemId)) {
  writeEnv({ FCC_MODEL_WORKSPACE_ID: ids.workspaceId, FCC_MODEL_ITEM_ID: ids.itemId });
  ok('rayfin/.env updated (never committed).');
}

// ---------- 3. Mapping ----------
const haveIds = (() => {
  const e = readEnv();
  return GUID.test(e.FCC_MODEL_WORKSPACE_ID ?? '') && GUID.test(e.FCC_MODEL_ITEM_ID ?? '');
})();
if (haveIds && (await confirm('Read the model and propose a mapping? (needs `npx rayfin login`)'))) {
  const connector = flag('connector') ?? 'salesmodel';
  const cols = invoke(connector, 'EVALUATE SELECTCOLUMNS ( FILTER ( INFO.VIEW.COLUMNS (), NOT [IsHidden] ), "Table", [Table], "Name", [Name], "DataType", [DataType] )');
  const meas = invoke(connector, 'EVALUATE SELECTCOLUMNS ( FILTER ( INFO.VIEW.MEASURES (), NOT [IsHidden] ), "Table", [Table], "Name", [Name] )');
  if (!cols.ok) {
    bad(`Could not read the model's columns. Sign in with \`npx rayfin login\`, check you have Build permission, and try again.\n${cols.out.trim().split('\n').slice(-5).join('\n')}`);
  } else {
    const columns = rowsFromInvoke(cols.parsed).map((r) => ({ table: String(r.Table), name: String(r.Name), dataType: r.DataType === undefined ? undefined : String(r.DataType) }));
    const measures = meas.ok ? rowsFromInvoke(meas.parsed).map((r) => ({ table: String(r.Table), name: String(r.Name) })) : [];
    const id = flag('model-id') ?? (await ask('Model id (file name in customize/models/):', 'sales'));
    const { model, notes } = proposeModel(columns, measures, { id, connector });
    console.log(`\nFound ${columns.length} columns and ${measures.length} measures. Proposed mapping:`);
    for (const n of notes) console.log(`  ${n}`);
    const problems = v.validateModel(model, `models/${id}.json`);
    for (const p of problems) warn(p);
    const file = join(custom, 'models', `${id}.json`);
    if (await confirm(`\nWrite customize/models/${id}.json${existsSync(file) ? ' (replaces the current file)' : ''}?`)) {
      writeJson(file, { $schema: '../schema/model.schema.json', ...model });
      ok(`customize/models/${id}.json written. Review labels and series in it; docs/connect-your-model.md explains each field.`);
    }
  }
}
rl.close();

// ---------- 4. Doctor ----------
console.log('');
const live = haveIds ? ['--live'] : [];
const r = spawnSync(process.execPath, [join(root, 'scripts', 'fcc-doctor.mjs'), ...live], { stdio: 'inherit' });
console.log(`\nNext: ${paint(1, 'npm run demo')} to look at it, then ${paint(1, 'npx rayfin up --workspace "<workspace name>"')} to deploy.`);
process.exit(r.status ?? 0);
