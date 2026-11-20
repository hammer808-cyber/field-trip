import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { APP_SKINS, FIELD_MANUAL_TOKENS } from '../skins/registry';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

// P2-1 (audit §10.1, §14): the skin-token system is the single source of
// truth for colour. This test is the ratchet that guards the consolidation:
// it fails on any NEW hard-coded hex outside the token files, so a colour
// can only enter through a skin token (or a @theme token in index.css).
//
// What it does NOT do: it does not demand zero hexes today. The pre-P2-1
// codebase still carries grandfathered literals (per-category tints,
// admin greys, texture gradients) that P2-1 deliberately did not sweep —
// see tokenHexSnapshot.json. Removing one is fine; adding one fails.

// Files that may still carry the deleted duplicate variants, and why.
// Everything else must not contain them at all.
const DELETED_VARIANT_ALLOWLIST: Record<string, string[]> = {
  // Missions freeze: #B7FF00 is a perceptibly different lime (delta R 21
  // from the token #CCFF00) that renders on the frozen Missions page.
  // Unify it only on Zach's word; the surrounding #FF5A00/#FAF8F5/#FFFDF4
  // in these files were unified (deltas of 2-4/255, imperceptible).
  'src/components/MissionDecodedCard.tsx': ['#b7ff00'],
  'src/components/MissionDetailsModal.tsx': ['#b7ff00'],
  // Approved generated badge art (audit: no replacement of approved
  // artwork). The whole SVG palette stays together, token orange included.
  'src/utils/missionImages.ts': ['#b7ff00', '#ff5a00'],
};

const DELETED_VARIANTS = [
  '#ff5a00', '#b7ff00', '#c7ff00', '#dcee0d', '#ff6b00',
  '#ff5a1f', '#c8ff1a', '#ff2fb3', '#184cff', '#7b2cff',
  '#fff8df', '#fdf4d0',
];

function collect(dir: string, out: string[]): void {
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

function scan(): Map<string, Set<string>> {
  const files: string[] = [];
  collect(join(repoRoot, 'src'), files);
  files.push('index.html', join('public', 'manifest.webmanifest'));
  const found = new Map<string, Set<string>>();
  for (const rel of files.sort()) {
    const text = readFileSync(join(repoRoot, rel), 'utf8');
    const hexes = new Set([...text.matchAll(HEX_RE)].map((m) => m[0].toLowerCase()));
    if (hexes.size > 0) found.set(rel, hexes);
  }
  return found;
}

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), 'utf8');
}

test('P2-1: the deleted --field-* token set does not come back', () => {
  // Definitions (--field-x:) or references (var(--field-x)) anywhere in
  // src. Class names like .field-card and the P2-1 comment in index.css
  // do not match either pattern.
  const files: string[] = [];
  collect(join(repoRoot, 'src'), files);
  const offenders: string[] = [];
  for (const rel of files) {
    const text = read(rel);
    if (/var\(--field-/.test(text) || /--field-[a-z]+:/.test(text)) offenders.push(rel);
  }
  assert.deepEqual(offenders, [], `deleted --field-* tokens reappeared in: ${offenders.join(', ')}`);
});

test('P2-1: the deleted duplicate orange/lime variants do not come back', () => {
  const found = scan();
  const offenders: string[] = [];
  for (const [rel, hexes] of found) {
    const allowed = new Set(DELETED_VARIANT_ALLOWLIST[rel] ?? []);
    for (const hex of hexes) {
      if (DELETED_VARIANTS.includes(hex) && !allowed.has(hex)) {
        offenders.push(`${rel}: ${hex}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `deleted duplicate variants found outside the deferred allowlist: ${offenders.join(', ')}`);
});

test('P2-1: no new hard-coded hex outside the token files', () => {
  // Ratchet: any (file, hex) present now but absent from the snapshot is
  // a new hard-coded colour and fails. Removals are allowed (further
  // consolidation). To bless a deliberate addition, regenerate with
  // `node scripts/generate-token-hex-snapshot.mjs` and review the diff.
  const snapshot = JSON.parse(read('src/__tests__/tokenHexSnapshot.json')) as {
    files: Record<string, string[]>;
  };
  const found = scan();
  const added: string[] = [];
  for (const [rel, hexes] of found) {
    const pinned = new Set(snapshot.files[rel] ?? []);
    for (const hex of [...hexes].sort()) {
      if (!pinned.has(hex)) added.push(`${rel}: ${hex}`);
    }
  }
  assert.deepEqual(added, [], `new hard-coded hexes (add them through a skin token, then regenerate the snapshot): ${added.join(', ')}`);
});

test('P2-1: the canonical palette matches the @theme tokens and the Classic skin', () => {
  const css = read('src/index.css');
  const theme = (name: string): string => {
    const match = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
    assert.ok(match, `@theme --color-${name} missing from index.css`);
    return match[1].toLowerCase();
  };
  assert.equal(theme('brand-orange'), FIELD_MANUAL_TOKENS.primary);
  assert.equal(theme('brand-lime'), FIELD_MANUAL_TOKENS.secondary);
  assert.equal(theme('paper'), FIELD_MANUAL_TOKENS.paper);
  assert.equal(theme('brand-magenta'), FIELD_MANUAL_TOKENS.magenta);
  assert.equal(theme('brand-blue'), FIELD_MANUAL_TOKENS.blue);
  assert.equal(theme('brand-cyan'), FIELD_MANUAL_TOKENS.cyan);
  assert.equal(theme('brand-yellow'), FIELD_MANUAL_TOKENS.yellow);
  assert.equal(theme('brand-purple'), FIELD_MANUAL_TOKENS.purple);
  assert.equal(theme('brand-teal'), FIELD_MANUAL_TOKENS.teal);

  const classic = APP_SKINS.find((skin) => skin.id === 'classic')!;
  const tokens = classic.designTokens;
  assert.equal(tokens.primary.toLowerCase(), FIELD_MANUAL_TOKENS.primary);
  assert.equal(tokens.secondary.toLowerCase(), FIELD_MANUAL_TOKENS.secondary);
  assert.equal(tokens.accent.toLowerCase(), FIELD_MANUAL_TOKENS.accent);
  assert.equal(tokens.success.toLowerCase(), FIELD_MANUAL_TOKENS.success);
  assert.equal(tokens.warning.toLowerCase(), FIELD_MANUAL_TOKENS.warning);
  assert.equal(tokens.error.toLowerCase(), FIELD_MANUAL_TOKENS.error);
  assert.equal(tokens.text.toLowerCase(), FIELD_MANUAL_TOKENS.ink);
  assert.equal(tokens.textMuted.toLowerCase(), FIELD_MANUAL_TOKENS.muted);
});

test('P2-1: theme-color is the token primary, not the third orange', () => {
  const html = read('index.html');
  assert.match(html, /<meta name="theme-color" content="#FF5C00" \/>/);
  assert.doesNotMatch(html, /#FF6B00/);
  const manifest = JSON.parse(read('public/manifest.webmanifest')) as {
    theme_color: string;
    background_color: string;
  };
  assert.equal(manifest.theme_color, '#FF5C00');
  assert.equal(manifest.background_color, '#FCF9F2');
});
