import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { validateCatalog, type Catalog } from '../src/engine/catalog';

const catalog: Catalog = JSON.parse(readFileSync('data/catalog.json', 'utf8'));
const errs = validateCatalog(catalog);

// Slots are part of every share link: an existing id must keep its slot forever.
try {
  const prev: Catalog = JSON.parse(execSync(`git show ${process.env.CATALOG_BASE ?? 'HEAD'}:data/catalog.json`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString());
  const now = new Map(catalog.items.map((i) => [i.id, i.slot]));
  for (const p of prev.items) {
    if (!now.has(p.id)) errs.push(`${p.id} was removed; mark it retired instead`);
    else if (now.get(p.id) !== p.slot) errs.push(`${p.id} changed slot ${p.slot} → ${now.get(p.id)}`);
  }
} catch {
  // No committed catalog yet (first commit or no git): nothing to compare.
}

if (errs.length) {
  console.error(`catalog.json: ${errs.length} problem(s)\n- ` + errs.join('\n- '));
  process.exit(1);
}
console.log(`catalog.json OK: ${catalog.items.length} entries, version ${catalog.version}`);
