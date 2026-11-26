#!/usr/bin/env node
/**
 * Switch the active brand:   npm run brand -- <pack>
 * List brand packs:          npm run brand
 * Brand packs live in customize/brands/<pack>/ (brand.json plus any logo files).
 * The active brand is customize/brand/; "default" restores the neutral brand.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packs = join(root, 'customize', 'brands');
const active = join(root, 'customize', 'brand');
const name = process.argv[2];
const available = readdirSync(packs, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);

if (!name) {
  console.log(`Brand packs: ${available.join(', ')}\nUse: npm run brand -- <pack>`);
  process.exit(0);
}
if (!/^[a-z0-9-]+$/.test(name) || !available.includes(name)) {
  console.error(`No brand pack "${name}". Available: ${available.join(', ')}`);
  process.exit(1);
}
const from = join(packs, name);
if (!existsSync(join(from, 'brand.json'))) {
  console.error(`customize/brands/${name}/brand.json is missing.`);
  process.exit(1);
}
rmSync(active, { recursive: true, force: true });
mkdirSync(active, { recursive: true });
for (const f of readdirSync(from)) if (f !== 'README.md') copyFileSync(join(from, f), join(active, f));
console.log(`Brand "${name}" is now active in customize/brand/. Run npm run doctor, then redeploy.`);
