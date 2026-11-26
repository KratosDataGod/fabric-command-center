#!/usr/bin/env node
/**
 * Fabric Command Center doctor: checks everything in /customize before you deploy.
 *
 *   npm run doctor             config, connectors, brand files
 *   npm run doctor -- --live   also runs every generated query against your model
 *   npm run doctor -- --discover [connector]   lists the model's tables, columns and measures
 *
 * --live and --discover need `npx rayfin login` first.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const custom = join(root, 'customize');
const src = join(root, 'packages', 'frontend', 'src');
const args = process.argv.slice(2);
const color = process.stdout.isTTY ? (c, s) => `\x1b[${c}m${s}\x1b[0m` : (_c, s) => s;
const ok = (s) => console.log(`${color(32, '✔')} ${s}`);
const warn = (s) => console.log(`${color(33, '!')} ${s}`);
const bad = (s) => console.log(`${color(31, '✖')} ${s}`);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    bad(`${path.replace(root + '/', '')}: ${e.message}`);
    process.exitCode = 1;
    return undefined;
  }
}
const jsonFiles = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => [f.replace(/\.json$/, ''), join(dir, f)]) : []);

// Reuse the app's own validation, so the doctor and the app never disagree.
const v = await import(join(src, 'config', 'validate.ts'));
const brand = readJson(join(custom, 'brand', 'brand.json'));
const features = readJson(join(custom, 'features.json'));
const models = Object.fromEntries(jsonFiles(join(custom, 'models')).map(([id, p]) => [id, readJson(p)]));
const profiles = jsonFiles(join(custom, 'profiles')).map(([, p]) => readJson(p)).filter(Boolean);
const pbiPath = join(custom, 'powerbi.local.json');
const powerBi = existsSync(pbiPath) ? readJson(pbiPath) : undefined;

const problems = [
  ...(brand ? v.validateBrand(brand) : []),
  ...Object.entries(models).flatMap(([id, m]) => (m ? [...v.validateModel(m, `models/${id}.json`), ...(m.id !== id ? [`models/${id}.json: "id" must be "${id}".`] : [])] : [])),
  ...v.validateProfiles(profiles, Object.keys(models)),
  ...(features ? v.validateFeatures(features) : []),
  ...(brand ? v.validateTogether(brand, Object.values(models).filter(Boolean)) : []),
  ...(features?.views?.report && powerBi ? v.validatePowerBi(powerBi) : []),
];
if (problems.length) problems.forEach(bad);
else ok(`customize/: brand, ${Object.keys(models).length} model(s), ${profiles.length} profile(s) and features are valid`);
if (problems.length) process.exitCode = 1;

// Readability
for (const w of brand ? v.brandContrastWarnings(brand) : []) warn(w);

// Brand files
for (const key of ['logo', 'mark', 'favicon']) {
  const f = brand?.[key];
  if (f && !existsSync(join(custom, 'brand', f))) {
    bad(`brand.json "${key}": customize/brand/${f} does not exist`);
    process.exitCode = 1;
  }
}

// Connectors named by models must exist in rayfin.yml
const yml = readFileSync(join(root, 'rayfin', 'rayfin.yml'), 'utf8');
const declared = [...yml.matchAll(/^\s*-\s*name:\s*([\w-]+)\s*$/gm)].map((m) => m[1]);
for (const [id, m] of Object.entries(models)) {
  if (m && !declared.includes(m.connector)) {
    bad(`models/${id}.json uses connector "${m.connector}", which is not in rayfin/rayfin.yml. See docs/connect-your-model.md.`);
    process.exitCode = 1;
  }
}

// ${VAR} placeholders need values in rayfin/.env
const envFile = join(root, 'rayfin', '.env');
const env = existsSync(envFile) ? Object.fromEntries(readFileSync(envFile, 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()])) : {};
const needed = [...new Set([...yml.matchAll(/\$\{([A-Z0-9_]+)\}/g)].map((m) => m[1]))];
const missing = needed.filter((k) => !(env[k] || process.env[k]));
if (missing.length) {
  warn(`rayfin/.env is missing ${missing.join(', ')}. Copy rayfin/.env.example to rayfin/.env and fill them in before deploying.`);
} else if (needed.length) ok(`rayfin/.env sets ${needed.join(', ')}`);

// Report tiles waiting for IDs
const pending = profiles.flatMap((p) => p.sections.flatMap((s) => s.items.filter((i) => i.type === 'report' && !(i.workspaceId && i.reportId)).map((i) => `${p.id}/${i.id}`)));
if (pending.length) warn(`${pending.length} report tile(s) still show "Setup needed": ${pending.join(', ')}`);

if (features?.views?.report) {
  if (!powerBi) warn('features.json turns on embedded reports, but customize/powerbi.local.json does not exist. Report tiles will open in Fabric instead.');
  else ok('Power BI embedding is configured');
}

function invoke(connector, query) {
  const r = spawnSync('npx', ['rayfin', 'connector', 'invoke', connector, 'executeQuery', '--input', JSON.stringify({ query }), '--json'], {
    cwd: root, encoding: 'utf8', shell: process.platform === 'win32', env: { ...process.env, ...env },
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  let parsed;
  try {
    parsed = JSON.parse(r.stdout.slice(r.stdout.indexOf('{')));
  } catch {
    parsed = undefined;
  }
  return { ok: r.status === 0 && !/"error"|"status"\s*:\s*"error"/i.test(r.stdout ?? ''), out, parsed };
}

if (args.includes('--live')) {
  const b = await import(join(src, 'dax', 'builder.ts'));
  const f = await import(join(src, 'state', 'filters.ts'));
  for (const [id, m] of Object.entries(models)) {
    if (!m) continue;
    const dims = f.dimensionsOf(m);
    const queries = [
      ['KPIs', b.kpiQuery(m, {}, dims)],
      ...dims.map((d) => [`${d.label} breakdown`, b.breakdownQuery(m, d, {}, dims, { order: d.role === 'time' ? 'dimension' : 'total', topN: 5 })]),
      ...(m.detail?.columns?.length ? [['Detail rows', b.detailQuery({ ...m, detail: { ...m.detail, maxRows: 10 } }, {}, dims)]] : []),
    ];
    console.log(`\nmodels/${id}.json → connector "${m.connector}"`);
    for (const [label, q] of queries) {
      const r = invoke(m.connector, q);
      if (r.ok) ok(label);
      else {
        bad(`${label}\n${q}\n${r.out.trim().split('\n').slice(-6).join('\n')}`);
        process.exitCode = 1;
      }
    }
  }
}

const di = args.indexOf('--discover');
if (di >= 0) {
  const connector = args[di + 1] && !args[di + 1].startsWith('--') ? args[di + 1] : declared[0];
  console.log(`\nDiscovering connector "${connector}"…`);
  for (const [label, q] of [
    ['Measures', "EVALUATE SELECTCOLUMNS ( INFO.VIEW.MEASURES(), \"Table\", [Table], \"Measure\", [Name] )"],
    ['Columns', "EVALUATE SELECTCOLUMNS ( FILTER ( INFO.VIEW.COLUMNS(), NOT [IsHidden] ), \"Table\", [Table], \"Column\", [Name], \"Type\", [DataType] )"],
  ]) {
    const r = invoke(connector, q);
    console.log(`\n${label}:`);
    console.log(r.ok ? r.out : `Could not run the query. Sign in with \`npx rayfin login\` and check rayfin/.env.\n${r.out}`);
  }
}

if (!process.exitCode) console.log(color(32, '\nReady.'));
