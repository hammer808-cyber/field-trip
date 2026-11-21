import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { pickTextOnBackground } from '../components/missions/MissionLogbookPanel';
import { APP_SKINS } from '../skins/registry';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P1-9 (audit §12, Nov 20): the arcade warning pill was unreadable —
// `bg-[var(--skin-warning)] text-white` with arcade warning #f6ea38 is
// 1.25:1, and classic #b96900 also failed at 4.13:1. P0-2 already wired
// the logbook panel's warning text through pickTextOnBackground, so the
// component fix predates this item; what P1-9 adds is the per-skin
// pinning test the audit's verification calls for ("contrast computation
// per skin"): every skin in the registry, its exact derived warning text
// color, and the before/after ratios, computed here from the token hex
// values with an independent WCAG relative-luminance implementation
// (same formula as smallTextContrast.test.ts) — the production picker is
// checked against this math, not against itself.

function contrastRatio(foreground: string, background: string): number {
  const luminance = (hex: string) => {
    const channels = hex.slice(1).match(/.{2}/g)!.map((part) => parseInt(part, 16) / 255);
    const linear = channels.map((channel) => (
      channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const AA_NORMAL = 4.5;

// Derived warning text color pinned per skin id. A new skin must add its
// own expectation here — the ratio test below covers it dynamically, but
// the exact pick is pinned so a token edit cannot silently flip the text
// color (e.g. notebook darkening until black becomes the pick).
const EXPECTED_WARNING_TEXT: Record<string, '#000000' | '#ffffff'> = {
  classic: '#000000',
  arcade: '#000000',
  journal: '#ffffff',
  'clubhouse-wall': '#ffffff',
  'baja-bratz': '#ffffff',
};

test('P1-9: the old hardcoded white-on-warning pair failed in classic and arcade (documents the bug)', () => {
  // Audit §4.1 table values, recomputed here.
  assert.ok(contrastRatio('#ffffff', '#b96900') < AA_NORMAL); // classic, 4.13
  assert.ok(contrastRatio('#ffffff', '#f6ea38') < AA_NORMAL); // arcade, 1.25
  // The other three skins passed with white — the fix must not regress them.
  assert.ok(contrastRatio('#ffffff', '#a7611d') >= AA_NORMAL); // journal, 4.80
  assert.ok(contrastRatio('#ffffff', '#b94c09') >= AA_NORMAL); // clubhouse, 5.12
  assert.ok(contrastRatio('#ffffff', '#a85f00') >= AA_NORMAL); // baja, 4.88
});

test('P1-9: every skin in the registry has a warning pair clearing 4.5:1 with the derived text color', () => {
  assert.ok(APP_SKINS.length > 0, 'expected at least one skin in the registry');
  for (const skin of APP_SKINS) {
    const warning = skin.designTokens.warning;
    const picked = pickTextOnBackground(warning);
    const ratio = contrastRatio(picked, warning);
    assert.ok(
      ratio >= AA_NORMAL,
      `${skin.id} warning: picked ${picked} on ${warning} is ${ratio.toFixed(2)}:1, below 4.5:1`,
    );
    // The picker must pick the higher-ratio side, never the failing one.
    assert.equal(
      picked,
      contrastRatio('#000000', warning) >= contrastRatio('#ffffff', warning) ? '#000000' : '#ffffff',
      `${skin.id} warning: picker did not choose the higher-contrast side`,
    );
  }
});

test('P1-9: the derived warning text color is pinned per skin', () => {
  // Five skins exist at the time of this fix. The id set is pinned so a
  // skin added (or removed) without an explicit expectation fails loudly
  // instead of silently riding the dynamic ratio test above.
  assert.deepEqual(
    APP_SKINS.map((skin) => skin.id).sort(),
    ['arcade', 'baja-bratz', 'classic', 'clubhouse-wall', 'journal'],
  );
  for (const skin of APP_SKINS) {
    assert.equal(
      pickTextOnBackground(skin.designTokens.warning),
      EXPECTED_WARNING_TEXT[skin.id],
      `${skin.id} warning ${skin.designTokens.warning}: expected derived text ${EXPECTED_WARNING_TEXT[skin.id]}`,
    );
  }
  // Exact after-ratios, recomputed: black on arcade is the 16.74:1 the
  // audit's solution names; classic black is 5.08:1.
  assert.ok(contrastRatio('#000000', '#f6ea38') >= 16.7);
  assert.ok(contrastRatio('#000000', '#b96900') >= 5.0);
});

test('P1-9: the logbook panel pairs every warning background with derived text, never hardcoded white', () => {
  const panel = read('src/components/missions/MissionLogbookPanel.tsx');
  assert.doesNotMatch(panel, /text-white/);
  // Three warning-background sites (status pill, urgent icon, need-action
  // pill), each fed by the derived color — not by a token or a literal.
  assert.equal(panel.match(/bg-\[var\(--skin-warning\)\]/g)?.length, 3);
  assert.match(panel, /pickTextOnBackground\(skinVarHex\('--skin-warning'/);
  assert.match(panel, /style=\{\{ color: warningText \}\}/);
  assert.match(panel, /style=\{\{ color: statusText\[item\.status\] \}\}/);
});

// Nov 20, 2026 follow-ups, same class as P1-9 (reported as two contrast
// bugs): the Missions NEEDS_MORE_PROOF warning chip hardcoded white on
// the warning background (arcade 1.25:1, classic 4.13:1), and the
// Basecamp attention pill used the skin text color on the same background
// (fails in 4 of 5 skins). Both now derive the color per skin.

test('contrast follow-up: the Missions warning chip derives its color per skin, never hardcoded white', () => {
  const deck = read('src/pages/Deck.tsx');
  // The warning chip (NEEDS_MORE_PROOF) and the adjacent error chip
  // (REJECTED_RETRY_AVAILABLE, white-on-error failed in arcade at 3.28:1)
  // both derive their icon color now.
  assert.match(deck, /pickTextOnBackground\(skinVarHex\('--skin-warning'/);
  assert.match(deck, /pickTextOnBackground\(skinVarHex\('--skin-error'/);
  assert.match(deck, /style=\{\{ color: warningText \}\}/);
  assert.match(deck, /style=\{\{ color: errorText \}\}/);
  // Neither chip may carry a hardcoded white again.
  assert.doesNotMatch(deck, /bg-\[var\(--skin-warning\)\] text-white/);
  assert.doesNotMatch(deck, /bg-\[var\(--skin-error\)\] text-white/);
  assert.doesNotMatch(deck, /AlertTriangle className="[^"]*text-white/);
});

test('contrast follow-up: the old Missions white-on-warning pair failed in classic and arcade (documents the bug)', () => {
  assert.ok(contrastRatio('#ffffff', '#b96900') < AA_NORMAL); // classic, 4.13
  assert.ok(contrastRatio('#ffffff', '#f6ea38') < AA_NORMAL); // arcade, 1.25
  assert.ok(contrastRatio('#ffffff', '#ff4a61') < AA_NORMAL); // arcade error, 3.28
});

test('contrast follow-up: the Basecamp attention pill derives its warning text per skin', () => {
  const panel = read('src/components/basecamp/BasecampAttentionPanel.tsx');
  assert.match(panel, /pickTextOnBackground\(skinVarHex\('--skin-warning'/);
  assert.match(panel, /style=\{\{ color: warningText \}\}/);
  // The pill's text must not come from the skin text token anymore.
  assert.doesNotMatch(panel, /bg-\[var\(--skin-warning\)\][^>]*text-\[var\(--skin-text\)\]/);
});

test('contrast follow-up: the old skin-text-on-warning pair failed in 4 of 5 skins (documents the bug)', () => {
  // Token values from the registry, recomputed here.
  assert.ok(contrastRatio('#ffffff', '#f6ea38') < AA_NORMAL); // arcade skin text, 1.25
  assert.ok(contrastRatio('#202621', '#a7611d') < AA_NORMAL); // journal skin text, 3.21
  assert.ok(contrastRatio('#171717', '#b94c09') < AA_NORMAL); // clubhouse skin text, 3.50
  assert.ok(contrastRatio('#073f4d', '#a85f00') < AA_NORMAL); // baja skin text, 2.35
  // Only classic passed with the skin text color.
  assert.ok(contrastRatio('#111111', '#b96900') >= AA_NORMAL); // classic, 4.57
});

test('contrast follow-up: the helpers live in src/logic/contrast, so Deck can use them without naming the logbook panel', () => {
  // Nov 20, 2026: the first version of the Missions fix imported the
  // helpers from MissionLogbookPanel and tripped the missions-bare pin
  // (Deck.tsx must not mention that module at all). The helpers are pure
  // logic; Deck and the attention panel import them from here.
  const deck = read('src/pages/Deck.tsx');
  assert.doesNotMatch(deck, /MissionLogbookPanel/);
  assert.match(deck, /from '\.\.\/logic\/contrast'/);
  const panel = read('src/components/basecamp/BasecampAttentionPanel.tsx');
  assert.match(panel, /from '\.\.\/\.\.\/logic\/contrast'/);
  // The panel keeps re-exporting them so its existing importers are untouched.
  const logbook = read('src/components/missions/MissionLogbookPanel.tsx');
  assert.match(logbook, /export \{ contrastRatio, pickTextOnBackground, relativeLuminance, skinVarHex \} from '\.\.\/\.\.\/logic\/contrast'/);
});
