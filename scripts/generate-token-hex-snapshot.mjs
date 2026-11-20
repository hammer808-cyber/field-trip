// Regenerates src/__tests__/tokenHexSnapshot.json for the P2-1 hex ratchet
// (see src/__tests__/tokenHexGuard.test.ts).
//
// Usage: node scripts/generate-token-hex-snapshot.mjs
// Run this ONLY when a hex was deliberately added or removed through a
// skin token (or a deferred Missions value was unified). The test fails on
// any hex present in the code but absent from the snapshot, so regenerating
// without reviewing the diff would silently bless a new hard-coded colour:
// always `git diff` the snapshot afterwards and confirm every addition is
// a token value, not a new literal in a component.
//
// Walk rules (keep in sync with tokenHexGuard.test.ts): every .ts/.tsx/.css
// file under src/ except __tests__ and except src/skins/** (the token
// home), plus index.html and public/manifest.webmanifest.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

function collect(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(repoRoot, full);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__' || rel === join('src', 'skins')) continue;
      collect(full, out);
      continue;
    }
    if (!/\.(ts|tsx|css)$/.test(entry)) continue;
    out.push(rel);
  }
}

const files = [];
collect(join(repoRoot, 'src'), files);
files.push('index.html', join('public', 'manifest.webmanifest'));

const snapshot = { generated: 'P2-1 token consolidation', files: {} };
for (const rel of files.sort()) {
  const text = readFileSync(join(repoRoot, rel), 'utf8');
  const hexes = [...new Set([...text.matchAll(HEX_RE)].map((m) => m[0].toLowerCase()))].sort();
  if (hexes.length > 0) snapshot.files[rel] = hexes;
}

writeFileSync(
  join(repoRoot, 'src', '__tests__', 'tokenHexSnapshot.json'),
  `${JSON.stringify(snapshot, null, 2)}\n`,
);
console.log(`wrote tokenHexSnapshot.json: ${Object.keys(snapshot.files).length} files with hexes`);
