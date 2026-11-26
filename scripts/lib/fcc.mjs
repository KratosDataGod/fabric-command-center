// Shared helpers for the Fabric Command Center scripts (doctor, setup, brand).
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const custom = join(root, 'customize');
export const src = join(root, 'packages', 'frontend', 'src');
export const envFile = join(root, 'rayfin', '.env');

const tty = process.stdout.isTTY;
export const paint = (c, s) => (tty ? `\x1b[${c}m${s}\x1b[0m` : s);
export const ok = (s) => console.log(`${paint(32, '✔')} ${s}`);
export const warn = (s) => console.log(`${paint(33, '!')} ${s}`);
export const bad = (s) => console.log(`${paint(31, '✖')} ${s}`);

export function readEnv() {
  if (!existsSync(envFile)) return {};
  return Object.fromEntries(
    readFileSync(envFile, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/))
      .filter(Boolean)
      .map((m) => [m[1], m[2].trim()])
  );
}

/** Sets keys in rayfin/.env, keeping every other line (and comments) as they were. */
export function writeEnv(values) {
  const lines = existsSync(envFile) ? readFileSync(envFile, 'utf8').split(/\r?\n/) : [];
  const seen = new Set();
  const out = lines.map((l) => {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (m && m[1] in values) {
      seen.add(m[1]);
      return `${m[1]}=${values[m[1]]}`;
    }
    return l;
  });
  for (const [k, v] of Object.entries(values)) if (!seen.has(k)) out.push(`${k}=${v}`);
  writeFileSync(envFile, out.join('\n').replace(/\n*$/, '\n'));
}

/** Runs one DAX query through the Rayfin CLI as the signed-in user. */
export function invoke(connector, query) {
  const r = spawnSync('npx', ['rayfin', 'connector', 'invoke', connector, 'executeQuery', '--input', JSON.stringify({ query }), '--json'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...readEnv() },
    maxBuffer: 64 * 1024 * 1024,
  });
  const stdout = r.stdout ?? '';
  let parsed;
  try {
    parsed = JSON.parse(stdout.slice(stdout.indexOf('{')));
    if (parsed?.outputFile && existsSync(parsed.outputFile)) parsed = { ...parsed, output: JSON.parse(readFileSync(parsed.outputFile, 'utf8')) };
  } catch {
    parsed = undefined;
  }
  const failed = r.status !== 0 || !parsed || parsed.status === 'error' || /"queryError":\{|"responseError":\{/.test(stdout);
  let out = `${stdout}${r.stderr ?? ''}`;
  if (/not signed in|interactive prompt/i.test(out)) {
    out += `\nSign in first: npx rayfin login. The first time, also approve Power BI access by running this once without --json:\n  npx rayfin connector invoke ${connector} executeQuery --input '{"query":"EVALUATE {1}"}'`;
  }
  return { ok: !failed, out, parsed };
}

/** Workspace and item IDs from a semantic model's address in Fabric or Power BI. */
export function parseModelUrl(text) {
  const m = String(text).match(/groups\/([0-9a-f-]{36})\/(?:datasets|semanticmodels|modeling)\/([0-9a-f-]{36})/i);
  return m ? { workspaceId: m[1], itemId: m[2] } : undefined;
}

export const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
