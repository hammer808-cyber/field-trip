import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P2-3 / P2-4 / P2-15 (audit §10.1, H1, H2, §5.2; Phase 3 design-system
// foundation, Nov 19): type scale + 12px floor for meaningful text,
// muted-text opacity cap at /60, and the font-load trim.
//
// File sets mirror the batch's scope exactly:
//   player  = everything under src/ except the sets below — the sweep
//             target. These files must have no sub-12px meaningful text
//             and no muted text below /60.
//   frozen  = the Missions render tree (Deck page + its panels). The
//             Missions freeze still stands; only the one named P2-4 gap
//             (the starter-complete 'unlocked' line in Deck.tsx) was
//             touched there, and it is asserted separately below.
//   admin   = admin-only / dev-only surfaces, out of H1/H2 scope.
//   skins   = src/skins/*.css — the remaining 7–8px there is decorative
//             only (skin ::before/::after chrome ornaments and the
//             .skin-preview-* miniature mockups), which the audit reserves
//             7–8px for.

const FROZEN = new Set([
  'src/pages/Deck.tsx',
  'src/pages/MissionBriefing.tsx',
  'src/components/DeckStack.tsx',
  'src/components/DeckLibrary.tsx',
  'src/components/DeckDiagnosticsPanel.tsx',
  'src/components/MissionDecodedCard.tsx',
  'src/components/MissionDetailsModal.tsx',
]);
const FROZEN_PREFIXES = ['src/components/missions/'];

function isAdmin(rel: string): boolean {
  if (rel.startsWith('src/components/admin/')) return true;
  const base = rel.split('/').at(-1)!;
  if (rel.startsWith('src/pages/') && base.startsWith('Admin')) return true;
  if (rel.startsWith('src/components/') && base.startsWith('Admin')) return true;
  if (rel === 'src/components/DevTools.tsx') return true;
  return false;
}

function classify(rel: string): 'player' | 'frozen' | 'admin' | 'skins' | 'tests' {
  if (rel.startsWith('src/__tests__/')) return 'tests';
  if (FROZEN.has(rel) || FROZEN_PREFIXES.some((p) => rel.startsWith(p))) return 'frozen';
  if (isAdmin(rel)) return 'admin';
  if (rel.startsWith('src/skins/')) return 'skins';
  return 'player';
}

function collectPlayerFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const rel = relative(repoRoot, full);
      if (statSync(full).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(full);
        continue;
      }
      if (/\.(ts|tsx|css)$/.test(entry) && classify(rel) === 'player') out.push(rel);
    }
  };
  walk(join(repoRoot, 'src'));
  return out.sort();
}

// Comments are not rendered text: the P2-3 comments in index.css record
// the old sizes ("was text-[10px]") and must not trip the scan.
const stripComments = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '');

const SUB_12_RE = /text-\[(?:6|7|8|9|10|10\.5|11)px\]/g;
// Black at /55 on white is 4.68:1 (passes); /50 and below fail.
const MUTED_BELOW_60_RE = /text-on-surface\/(?:10|20|25|30|35|40|45|50)\b/g;

// Independent WCAG relative-luminance implementation (same formula as
// smallTextContrast.test.ts) — the fixed pairs are checked against this
// math, not eyeballed.
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
// Opacity compositing over a solid background: result = fg*a + bg*(1-a).
function composite(fg: string, bg: string, alpha: number): string {
  const parts = (hex: string) => hex.slice(1).match(/.{2}/g)!.map((p) => parseInt(p, 16));
  const f = parts(fg);
  const b = parts(bg);
  const mixed = f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)));
  return `#${mixed.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

test('P2-15: the Google Fonts import carries only the families skins and components use', () => {
  const css = read('src/index.css');
  const importLine = css.split('\n')[0];
  const families = [...importLine.matchAll(/family=([^&:]+)/g)].map((m) => decodeURIComponent(m[1].replace(/\+/g, ' ')));
  assert.deepEqual(
    families.sort(),
    ['Bebas Neue', 'Courier Prime', 'Inter', 'JetBrains Mono', 'Kalam', 'Newsreader', 'Outfit', 'Permanent Marker', 'Space Grotesk'].sort(),
    `expected 9 loaded families, got: ${families.join(', ')}`,
  );
  // Dropped: Geist and Anton had zero component uses (import only).
  assert.doesNotMatch(importLine, /family=Geist/);
  assert.doesNotMatch(importLine, /family=Anton/);
  // Kept deliberately: Kalam (Field Notebook / Clubhouse / Baja skins),
  // Permanent Marker (Clubhouse + .ft-sticker), Outfit (BigBoard and
  // friends), Space Grotesk + JetBrains Mono (Arcade / Baja skins).
  for (const kept of ['Kalam', 'Permanent+Marker', 'Outfit', 'Space+Grotesk', 'JetBrains+Mono']) {
    const pattern = new RegExp(`family=${kept.replace(/\+/g, '\\+')}`);
    assert.match(importLine, pattern, `${kept} must stay imported`);
  }
});

test('P2-15: --font-display / --font-sans are defined exactly once, and Titan One is gone', () => {
  const css = read('src/index.css');
  assert.equal((css.match(/--font-display:/g) ?? []).length, 1);
  assert.equal((css.match(/--font-sans:/g) ?? []).length, 1);
  assert.match(css, /--font-display: var\(--font-heading, "Bebas Neue"\), sans-serif;/);
  assert.match(css, /--font-sans: var\(--font-body, "Inter"\), ui-sans-serif, system-ui, sans-serif;/);
  assert.doesNotMatch(css, /Titan One/);
  assert.doesNotMatch(css, /--font-anton/);
  assert.doesNotMatch(css, /\.app-skin-baja-bratz/);
});

test('P2-3: the display scale is tokenised from the sizes already in use', () => {
  const css = read('src/index.css');
  assert.match(css, /--text-display-hero: clamp\(2\.75rem, 12vw, 5\.5rem\);/);
  assert.match(css, /--text-display-section: clamp\(1\.875rem, 6vw, 3rem\);/);
  assert.match(css, /--text-display-card: 1\.5rem;/);
  // The 12px floor for meaningful text, and the decorative-only micro size.
  assert.match(css, /--text-label: 0\.75rem;/);
  assert.match(css, /--text-micro: 0\.5rem;/);
});

test('P2-3: the shared label classes in index.css sit at the 12px floor', () => {
  // Comments record the old sizes ("was text-[10px]"), so the negative
  // checks run on comment-stripped CSS; the positives run on raw CSS.
  const css = read('src/index.css');
  const stripped = stripComments(css);
  assert.match(css, /\.micro-label \{[^}]*text-xs/);
  assert.match(css, /\.status-chip \{[^}]*font-size: 0\.75rem;/);
  assert.match(css, /\.evidence-label \{[^}]*text-xs/);
  assert.match(css, /\.bureau-btn-sm \{[^}]*text-xs/);
  assert.match(css, /\.bureau-tag \{[^}]*text-xs/);
  assert.match(css, /\.field-label \{[^}]*text-xs/);
  assert.match(css, /\.ft-chip-status \{[^}]*text-xs/);
  assert.match(css, /\.ft-chip-interactive \{[^}]*text-xs/);
  assert.doesNotMatch(stripped, /\.micro-label \{[^}]*text-\[10px\]/);
  assert.doesNotMatch(stripped, /\.status-chip \{[^}]*font-size: 0\.72rem;/);
  // Frankie Mode's typographic override is untouched by the token work.
  assert.match(css, /\.frankie-active \.text-huge \{[^}]*font-size: 2\.5rem !important;/);
});

test('P2-3: the plain-CSS label sizes sit at the 12px floor', () => {
  const basecamp = read('src/pages/Basecamp.css');
  assert.doesNotMatch(basecamp, /font-size:\s*8px/);
  assert.match(basecamp, /\.basecamp-flavor \{[^}]*font-size: 12px;/);
  assert.match(basecamp, /\.basecamp-utility button \{[^}]*font-size: 12px;/);
  // P2-18 owns the 40px min-height (M8); this batch only floors the size.
  assert.match(basecamp, /\.basecamp-utility button \{[^}]*min-height: 40px;/);
  const nav = read('src/components/BottomNav.css');
  assert.match(nav, /\.ft-nav-now-label \{[^}]*font: 900 12px\/1\.1/);
  const departments = read('src/components/player/departments.css');
  assert.match(departments, /\.ft-status-chip \{[^}]*font-size: 12px;/);
});

test('P2-3: no sub-12px meaningful text remains in player-facing files', () => {
  const offenders: string[] = [];
  for (const rel of collectPlayerFiles()) {
    const hits = stripComments(read(rel)).match(SUB_12_RE) ?? [];
    if (hits.length > 0) offenders.push(`${rel}: ${[...new Set(hits)].join(', ')}`);
  }
  assert.deepEqual(offenders, [], `sub-12px text remains in player files: ${offenders.join('; ')}`);
});

test('P2-4: no muted text below /60 remains in player-facing files', () => {
  const offenders: string[] = [];
  for (const rel of collectPlayerFiles()) {
    const hits = stripComments(read(rel)).match(MUTED_BELOW_60_RE) ?? [];
    if (hits.length > 0) offenders.push(`${rel}: ${[...new Set(hits)].join(', ')}`);
  }
  assert.deepEqual(offenders, [], `muted text below /60 remains in player files: ${offenders.join('; ')}`);
});

test('P2-4: the fixed pairs clear 4.5:1, and the old pairs document why they changed', () => {
  const AA = 4.5;
  // The old pairs (audit §4.1) — these are the bug, documented.
  assert.ok(contrastRatio('#FF5C00', '#FCF9F2') < AA); // orange on paper ~2.94
  assert.ok(contrastRatio('#00F0FF', '#FAF8F5') < AA); // cyan on paper ~1.33
  assert.ok(contrastRatio('#CCFF00', '#ffffff') < AA); // lime on white ~1.18
  assert.ok(contrastRatio(composite('#000000', '#ffffff', 0.5), '#ffffff') < AA); // /50 ~3.95
  assert.ok(contrastRatio(composite('#000000', '#ffffff', 0.45), '#ffffff') < AA); // /45 ~3.36
  // The replacements.
  assert.ok(contrastRatio('#000000', '#FCF9F2') >= AA); // ink on paper ~19.97
  assert.ok(contrastRatio('#C2410C', '#ffffff') >= AA); // darkened orange ~5.18
  assert.ok(contrastRatio(composite('#000000', '#ffffff', 0.6), '#ffffff') >= AA); // /60 ~5.74
  assert.ok(contrastRatio(composite('#ffffff', '#000000', 0.6), '#000000') >= AA); // white/60 on black ~7.36
  assert.ok(contrastRatio(composite('#ffffff', '#000000', 0.4), '#000000') < AA); // white/40 on black ~3.66
});

test('P2-4: the three named P0-2 gaps are fixed where the components render them', () => {
  const deck = read('src/pages/Deck.tsx');
  // Named gap 1: starter-complete 'unlocked' line was 14px #FF5C00 (~2.9:1).
  assert.match(deck, /text-sm font-mono font-bold text-on-surface uppercase tracking-wider/);
  assert.doesNotMatch(deck, /text-brand-orange uppercase tracking-wider\}>\{getDisplayLabel\('HEATWAVE_RECEIPTS'\)\}/);

  const proofCard = read('src/components/CommunityProofCard.tsx');
  // Named gap 2: deck-label pill was 7px text-on-surface/45 (~2.4:1).
  assert.match(proofCard, /text-xs font-mono font-black uppercase text-on-surface\/60 bg-on-surface\/5/);
  assert.doesNotMatch(proofCard, /text-on-surface\/45/);
  // The modal headings in the same file were 12px orange on paper.
  assert.match(proofCard, /text-on-surface">Community Receipt/);
  assert.match(proofCard, /text-on-surface">Private Signal Check/);

  const hero = read('src/components/FieldPageHero.tsx');
  // Named gap 3 (editorial variant): skin-primary season line.
  assert.match(hero, /chrome \? 'text-brand-lime' : 'text-\[var\(--skin-text\)\]'/);
  const nextAction = read('src/components/basecamp/BasecampNextActionPanel.tsx');
  assert.match(nextAction, /text-\[var\(--skin-text\)\]">/);
  assert.doesNotMatch(nextAction, /text-\[var\(--skin-primary\)\]/);
});

test('P2-4: the verified audit-table fails in the same territory are fixed', () => {
  const meter = read('src/components/EvidenceMeter.tsx');
  assert.match(meter, /text-on-surface font-black uppercase tracking-widest mt-0\.5">UPLINK \/\/ ACTIVE/);
  assert.doesNotMatch(meter, /text-brand-cyan font-black uppercase tracking-widest mt-0\.5/);
  assert.doesNotMatch(meter, /text-white\/40/);

  const packs = read('src/components/DeckPackSelector.tsx');
  assert.doesNotMatch(packs, /text-brand-lime border border-brand-lime\/30/);
  assert.doesNotMatch(packs, /text-brand-orange border border-brand-orange\/30/);
  assert.doesNotMatch(packs, /text-brand-orange bg-brand-orange\/10/);

  const challenge = read('src/components/ChallengeCard.tsx');
  assert.match(challenge, /text-\[#C2410C\][\s\S]{0,120}FINISH THE EARLIER ADVENTURES/);

  const onboarding = read('src/components/FieldKitOnboarding.tsx');
  assert.match(onboarding, /text-on-surface">Camera \+ location/);

  const typeCard = read('src/components/FieldTypeCard.tsx');
  assert.doesNotMatch(typeCard, /text-brand-orange tracking-\[0\.2em\] opacity-40/);
  assert.match(typeCard, /text-white\/60 uppercase tracking-tighter">SIGNAL_LIVE/);

  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /data\.note\.length >= 10 \? "text-on-surface" : "text-on-surface\/60"/);
  assert.doesNotMatch(clipboard, /font-mono text-xs opacity-30/);
});
