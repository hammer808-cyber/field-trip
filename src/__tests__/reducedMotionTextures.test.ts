import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const indexCss = readFileSync(join(repoRoot, 'src/index.css'), 'utf8');

// P2-5 (audit §4 M3, §6.1): one global reduced-motion rule in index.css.
// The framer-motion layer is already gated by MotionConfig; this is the
// ratchet for the CSS layer (card-sheen, prism-flow, shimmer, Tailwind
// animate-*). Mirrors the blanket 0.01ms rule in the notebook/clubhouse skins.
test('P2-5: index.css has one global prefers-reduced-motion block', () => {
  const blocks = indexCss.match(/@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/g) || [];
  assert.equal(blocks.length, 1, `expected exactly 1 reduced-motion block, found ${blocks.length}`);
  const block = indexCss.slice(indexCss.indexOf('@media (prefers-reduced-motion: reduce)'));
  assert.match(block, /animation-duration:\s*0\.01ms\s*!important/);
  assert.match(block, /animation-iteration-count:\s*1\s*!important/);
  assert.match(block, /transition-duration:\s*0\.01ms\s*!important/);
  // The named ambient animations must live in the same file the rule gates.
  for (const name of ['card-sheen-sweep', 'prism-flow', 'shimmer']) {
    assert.ok(indexCss.includes(`@keyframes ${name}`), `missing @keyframes ${name}`);
  }
});

// P2-16 (audit §5.4, §12): every live texture reference points at the
// self-hosted files in public/assets/textures/ — no hotlink remains in src/
// except the BLOCKED splatter mask-image (HTTP 404 upstream; needs a user
// decision, do not re-point it — see public/assets/textures/MANIFEST.md).
const TEXTURES = [
  'handmade-paper.png',
  'micro-carbon.png',
  'cubes.png',
  'felt.png',
  'graphy-dark.png',
  'grid-me.png',
  'cream-paper.png',
];

function walkSrc(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      // Test files name the host in string literals; the ratchet guards
      // shipped code, not the tests that enforce it.
      if (entry.name === '__tests__') continue;
      walkSrc(join(dir, entry.name), out);
    } else if (/\.(css|ts|tsx)$/.test(entry.name)) out.push(join(dir, entry.name));
  }
  return out;
}

test('P2-16: no transparenttextures.com URL remains in src/ except splatter', () => {
  const offenders: string[] = [];
  for (const file of walkSrc(join(repoRoot, 'src'))) {
    const text = readFileSync(file, 'utf8');
    for (const line of text.split('\n')) {
      if (line.includes('transparenttextures.com') && !line.includes('splatter.png')) {
        offenders.push(`${file}: ${line.trim()}`);
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test('P2-16: self-hosted texture files exist and are real PNGs', () => {
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  for (const name of TEXTURES) {
    const path = join(repoRoot, 'public/assets/textures', name);
    assert.ok(existsSync(path), `missing ${path}`);
    const head = readFileSync(path).subarray(0, 8);
    assert.ok(head.equals(pngMagic), `${name} is not a PNG`);
  }
});

test('P2-16 BLOCKED: splatter mask-image references are left exactly as-is', () => {
  const hits = indexCss.split('\n').filter((l) =>
    l.includes('splatter.png') && l.includes('mask-image'));
  assert.equal(hits.length, 2, `expected 2 untouched splatter mask-image refs, found ${hits.length}`);
  for (const line of hits) {
    assert.ok(line.includes('https://www.transparenttextures.com/patterns/splatter.png'), line.trim());
  }
});
