import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// Representative-journey migration (audit §9 Direction A, §10.1, §13
// Phase 3): onboarding (Classification/quiz -> FieldTypeResult ->
// Field Kit) -> first mission (briefing -> Capture -> submit), migrated
// onto the tokens that landed in waves 1-3. The point is unification,
// not a new look: every swap below preserves the rendered value — a
// literal for the token holding the (near-)identical value, following
// the P2-1 precedent (near-identical papers -> bg-paper, deltas
// <=7/255, imperceptible).
//
// Journey files in scope:
const JOURNEY_FILES = [
  'src/pages/Classification.tsx',
  'src/components/onboarding/PersonaQuiz.tsx',
  'src/pages/FieldTypeResult.tsx',
  'src/components/FieldKitOnboarding.tsx',
  'src/pages/MissionBriefing.tsx',
  'src/pages/Capture.tsx',
  'src/components/FieldClipboard.tsx',
  'src/pages/MissionSubmitted.tsx',
  'src/components/FieldPageHero.tsx',
  'src/components/DevelopingPolaroid.tsx',
  'src/components/ViewfinderCamera.tsx',
  'src/components/EvidenceMeter.tsx',
  'src/components/VoiceNoteRecorder.tsx',
];

const HEX_RE = /#[0-9a-fA-F]{3,8}\b/g;

// Deferred hexes left in place on purpose: no skin/@theme token holds
// the identical value, so per the migration rule the literal stays
// rather than inventing a colour or changing the render.
const DEFERRED_HEX: Record<string, string[]> = {
  // Lime-300 hard offset shadow (#bef264 vs secondary #ccff00: B
  // differs by 100 — perceptibly softer, not the token lime).
  'src/components/FieldKitOnboarding.tsx': ['#bef264'],
  // Error-red hard shadow (#ff3131 vs skin error #c52233 / @theme
  // #FF003D — no identical token).
  'src/pages/Capture.tsx': ['#ff3131'],
  'src/components/FieldClipboard.tsx': ['#2ee7f0', '#ff3131'],
  // #2EE7F0 card-type chip: between accent #00b7c7 and cyan #00f0ff,
  // identical to neither.
  // Editorial-variant chrome tone (#141414 vs ink #111111 — no
  // identical token) + the DEFAULT variant, which this batch does not
  // touch (P2-2 hero unification is out of scope): #faf8f5, #4a473e.
  // (Nov 21, 2026: the card tabs' #e8e2d2 left the deferred list —
  // the Field Manual chrome kit moved it to var(--skin-surface-muted).)
  'src/components/FieldPageHero.tsx': ['#141414', '#faf8f5', '#4a473e'],
  // Dark develop-stage backdrop (#141615 vs ink #111111).
  'src/components/DevelopingPolaroid.tsx': ['#141615'],
  // Canvas 2D API literals: fillStyle/strokeStyle cannot take a CSS
  // var() without a computed-style read (a behaviour change), and
  // #ffece3 / #22d3ee / #bef264 have no identical token. #ff5c00 is
  // the primary token value, spelled as a canvas literal.
  'src/components/ViewfinderCamera.tsx': [
    '#000', '#0c0c0e', '#1c1c1e', '#22d3ee', '#bef264', '#ff5c00', '#ffece3', '#ffffff',
  ],
};

test('journey migration: no hard-coded hex in the journey files except the deferred list', () => {
  const offenders: string[] = [];
  for (const rel of JOURNEY_FILES) {
    const text = read(rel);
    const hexes = new Set([...text.matchAll(HEX_RE)].map((m) => m[0].toLowerCase()));
    const allowed = new Set(DEFERRED_HEX[rel] ?? []);
    for (const hex of [...hexes].sort()) {
      if (!allowed.has(hex)) offenders.push(`${rel}: ${hex}`);
    }
    // The deferred list is exact: a listed hex that is gone means a
    // later migration landed and this map must be updated deliberately.
    for (const hex of allowed) {
      if (!hexes.has(hex)) offenders.push(`${rel}: deferred ${hex} is gone — update DEFERRED_HEX`);
    }
  }
  assert.deepEqual(offenders, [], `unexpected journey hexes: ${offenders.join(', ')}`);
});

test('journey migration: the near-identical papers are unified on bg-paper', () => {
  for (const rel of JOURNEY_FILES) {
    const text = read(rel);
    for (const paper of ['#faf8f5', '#fcf8f2', '#fffceb', '#fffdf6', '#faf9f6']) {
      // FieldPageHero's #faf8f5 is the out-of-scope default variant.
      if (rel === 'src/components/FieldPageHero.tsx' && paper === '#faf8f5') continue;
      assert.doesNotMatch(
        text.toLowerCase(),
        new RegExp(paper.replace('#', '#')),
        `${rel} still carries ${paper} — unify it on bg-paper`,
      );
    }
  }
  // And the unified sites actually read the token.
  assert.match(read('src/pages/MissionBriefing.tsx'), /bg-paper/);
  assert.match(read('src/pages/Capture.tsx'), /bg-paper text-on-surface/);
  assert.match(read('src/components/EvidenceMeter.tsx'), /bg-paper/);
  assert.match(read('src/pages/MissionSubmitted.tsx'), /bg-paper/);
  assert.match(read('src/components/DevelopingPolaroid.tsx'), /bg-paper/);
  assert.match(read('src/components/VoiceNoteRecorder.tsx'), /bg-paper/);
});

test('journey migration: display text uses the type-scale tokens', () => {
  const hero = read('src/components/FieldPageHero.tsx');
  // Editorial h1: the base clamp IS the hero token value; the sm:
  // clamp (3.5rem/11vw/6rem) has no token and stays literal.
  assert.match(hero, /text-display-hero font-black uppercase italic leading-\[0\.82\]/);
  assert.doesNotMatch(hero, /text-\[clamp\(2\.75rem,12vw,5\.5rem\)\]/);

  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /font-display text-display-card sm:text-3xl/);

  const result = read('src/pages/FieldTypeResult.tsx');
  assert.match(result, /text-display-card leading-tight font-medium/);
  assert.match(result, /text-xl sm:text-display-card leading-snug font-black/);
  // Sizes with no token (text-3xl/4xl/5xl/6xl/7xl/8xl) stay literal —
  // the section clamp spans that band but is not identical at a given
  // viewport, so swapping would change the render.
  assert.match(result, /text-7xl md:text-8xl/);
});

test('journey migration: labels use text-label where the line-height is already explicit', () => {
  // text-xs (0.75rem) and text-label (0.75rem) share the size; the
  // swap is value-identical only where an explicit leading-* already
  // governs the line box. So no text-xs with an explicit leading may
  // remain in the journey files — except FieldPageHero, whose one
  // remaining instance sits in the out-of-scope default variant.
  const offenders: string[] = [];
  const LEADING_WITH_XS = /text-xs [^"']*leading-(none|tight|snug|normal|relaxed|loose)|leading-(none|tight|snug|normal|relaxed|loose) [^"']*text-xs/g;
  for (const rel of JOURNEY_FILES) {
    if (rel === 'src/components/FieldPageHero.tsx') continue;
    const hits = read(rel).match(LEADING_WITH_XS) ?? [];
    if (hits.length > 0) offenders.push(`${rel}: ${[...new Set(hits)].join(', ')}`);
  }
  assert.deepEqual(offenders, [], `text-xs with explicit leading remains: ${offenders.join('; ')}`);
  // Spot-check the adopted sites.
  assert.match(read('src/components/onboarding/PersonaQuiz.tsx'), /text-label font-bold leading-relaxed/);
  assert.match(read('src/components/FieldKitOnboarding.tsx'), /text-label font-black uppercase tracking-wider leading-none/);
  assert.match(read('src/components/EvidenceMeter.tsx'), /text-label font-mono text-on-surface\/60/);
});

test('journey migration: MissionBriefing carries the 12px floor and /60 muted cap', () => {
  // The one journey file the P2-3/P2-4 waves left behind (it was
  // classified frozen-adjacent in their test). Same pattern as the
  // waves: sub-12px -> text-xs, text-on-surface below /60 -> /60.
  const briefing = read('src/pages/MissionBriefing.tsx');
  assert.doesNotMatch(briefing, /text-\[(6|7|8|9|10|10\.5|11)px\]/);
  assert.doesNotMatch(briefing, /text-on-surface\/(10|20|25|30|35|40|45|50)\b/);
  assert.match(briefing, /font-mono text-xs font-black uppercase tracking-widest opacity-40/);
  assert.match(briefing, /text-on-surface\/60 hover:text-on-surface font-mono text-xs/);
});
