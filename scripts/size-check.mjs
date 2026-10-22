// Fails the build if gzipped JS + CSS exceed 150 KB (fonts excluded; they load separately).
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
const dir = 'dist/assets';
let total = 0;
for (const f of readdirSync(dir)) {
  if (/\.(js|css)$/.test(f)) total += gzipSync(readFileSync(`${dir}/${f}`)).length;
}
const kb = (total / 1024).toFixed(1);
if (total > 150 * 1024) {
  console.error(`Bundle too big: ${kb} KB gzipped (limit 150 KB)`);
  process.exit(1);
}
console.log(`Bundle size OK: ${kb} KB gzipped JS + CSS`);
