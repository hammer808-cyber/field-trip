import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { MissionActionPanel } from '../components/missions/MissionActionPanel';
import {
  MissionLogbookPanel,
  pickTextOnBackground,
} from '../components/missions/MissionLogbookPanel';
import { APP_SKINS } from '../skins/registry';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// P0-2 (audit fix, Nov 19): every small-text color pair touched by the fix
// must clear the 4.5:1 normal-text bar. Ratios are computed here from the
// token hex values with an independent WCAG relative-luminance
// implementation (same formula as skinArchitecture.test.ts) — nothing is
// eyeballed, and the production picker is checked against this math,
// not against itself.

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

test('P0-2: the old white small-text pairs failed 4.5:1 (documents the bug)', () => {
  // Audit §4.1 table values, recomputed here.
  assert.ok(contrastRatio('#ffffff', '#FF5C00') < AA_NORMAL); // 3.10
  assert.ok(contrastRatio('#ffffff', '#FF00FF') < AA_NORMAL); // 3.14
  assert.ok(contrastRatio('#ffffff', '#FF2FB3') < AA_NORMAL); // 3.33
  assert.ok(contrastRatio('#ffffff', '#FF003D') < AA_NORMAL); // 3.95
  assert.ok(contrastRatio('#ffffff', '#ff4b65') < AA_NORMAL); // 3.26
  assert.ok(contrastRatio('#FF5C00', '#ffffff') < AA_NORMAL); // 3.10
  assert.ok(contrastRatio('#D84315', '#ffffff') < AA_NORMAL); // 4.44
  assert.ok(contrastRatio('#ffffff', '#F6EA38') < AA_NORMAL); // 1.25
});

test('P0-2: the fixed hard-coded pairs clear 4.5:1', () => {
  // Black text on the bright brand backgrounds (ribbons, badges, chips).
  assert.ok(contrastRatio('#000000', '#FF5C00') >= AA_NORMAL); // 6.78
  assert.ok(contrastRatio('#000000', '#FF00FF') >= AA_NORMAL); // 6.70
  assert.ok(contrastRatio('#000000', '#FF2FB3') >= AA_NORMAL); // 6.31
  assert.ok(contrastRatio('#000000', '#FF003D') >= AA_NORMAL); // 5.32
  assert.ok(contrastRatio('#000000', '#ff4b65') >= AA_NORMAL); // 6.45
  // Darkened orange label text on white (ChallengeCard WHAT TO HUNT / WHY IT'S FUN).
  assert.ok(contrastRatio('#C2410C', '#ffffff') >= AA_NORMAL); // 5.18
  // Status-chip variants that inherit the base black text.
  assert.ok(contrastRatio('#000000', '#ffd02a') >= AA_NORMAL); // review, 14.31
  assert.ok(contrastRatio('#000000', '#c8ff1a') >= AA_NORMAL); // pre-P2-1 approved lime, 17.77
  // P2-1: the approved chip now reads the unified token lime.
  assert.ok(contrastRatio('#000000', '#ccff00') >= AA_NORMAL); // 17.87
});

test('P0-2: the fixed pairs are the ones the components actually render', () => {
  const challengeCard = read('src/components/ChallengeCard.tsx');
  assert.match(challengeCard, /bg-brand-orange text-black[\s\S]{0,200}SEALED FILE/);
  assert.match(challengeCard, /text-\[#C2410C\][\s\S]{0,200}WHAT TO HUNT/);
  assert.match(challengeCard, /text-\[#C2410C\][\s\S]{0,200}WHY IT'S FUN/);
  assert.doesNotMatch(challengeCard, /text-brand-orange flex/);

  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /bg-brand-orange text-black[\s\S]{0,300}TRANSMISSION_RECEIVED/);

  const proofCard = read('src/components/CommunityProofCard.tsx');
  assert.match(proofCard, /bg-brand-magenta text-black/);
  assert.doesNotMatch(proofCard, /text-brand-lime bg-brand-lime\/10/);
  assert.doesNotMatch(proofCard, /text-brand-magenta bg-brand-magenta\/10/);
  assert.doesNotMatch(proofCard, /opacity-80/);

  const css = read('src/index.css');
  // P2-1 companion rename (same assertion, same value #111111): the
  // --field-* token set is deleted; the chip ink is --skin-border now.
  assert.match(css, /\.status-chip \{[^}]*color: var\(--skin-border/);
  assert.match(css, /\.status-chip\.needs-proof \{[^}]*color: #000000/);
  assert.match(css, /\.status-chip\.locked \{[^}]*color: #000000/);
  assert.doesNotMatch(css, /\.status-chip\.needs-proof \{[^}]*color: white/);
  assert.doesNotMatch(css, /\.status-chip\.locked \{[^}]*color: white/);
});

test('P0-2: the large-text submit CTA is untouched (out of scope)', () => {
  // FieldClipboard.tsx:596 is text-2xl white on brand-orange: 3.10:1
  // passes the 3:1 large-text bar, so P0-2 deliberately leaves it alone.
  const clipboard = read('src/components/FieldClipboard.tsx');
  assert.match(clipboard, /bg-brand-orange text-white hover:bg-on-surface/);
});

test('P0-2: per-skin warning/success/error/primary/secondary pairs clear 4.5:1', () => {
  for (const skin of APP_SKINS) {
    const tokens = skin.designTokens;
    for (const [name, background] of Object.entries({
      warning: tokens.warning,
      success: tokens.success,
      error: tokens.error,
      primary: tokens.primary,
      secondary: tokens.secondary,
    })) {
      const picked = pickTextOnBackground(background);
      const ratio = contrastRatio(picked, background);
      assert.ok(
        ratio >= AA_NORMAL,
        `${skin.id} ${name}: picked ${picked} on ${background} is ${ratio.toFixed(2)}:1, below 4.5:1`,
      );
    }
  }
});

test('P0-2: the picker chooses the passing side on the known failing skins', () => {
  assert.equal(pickTextOnBackground('#f6ea38'), '#000000'); // arcade warning, white was 1.25:1
  assert.equal(pickTextOnBackground('#b96900'), '#000000'); // classic warning, white was 4.13:1
  assert.equal(pickTextOnBackground('#a7611d'), '#ffffff'); // notebook warning, black is 4.37:1
  assert.equal(pickTextOnBackground('#b94c09'), '#ffffff'); // clubhouse warning, black is 4.10:1
  assert.equal(pickTextOnBackground('#a85f00'), '#ffffff'); // baja warning, black is 4.30:1
  assert.equal(pickTextOnBackground('#ff4a61'), '#000000'); // arcade error, white was 3.28:1
  assert.equal(pickTextOnBackground('#00e89c'), '#000000'); // arcade success, white was 1.61:1
  assert.equal(pickTextOnBackground('#00a6b2'), '#000000'); // baja secondary, white was 2.96:1
  assert.equal(pickTextOnBackground('#ff5c00'), '#000000'); // classic primary, white was 3.10:1
  assert.equal(pickTextOnBackground('#ff2d7a'), '#000000'); // arcade primary, white was 3.55:1
});

test('P0-2: logbook renders derived (not white) text on its status pills', () => {
  const noop = () => {};
  const html = renderToStaticMarkup(
    React.createElement(MissionLogbookPanel, {
      open: true,
      onOpenChange: noop,
      counts: {
        totalSubmitted: 3,
        pendingReview: 0,
        approvedVerified: 1,
        rejectedOrNeedsMoreProof: 2,
        communityEligible: 1,
      },
      items: [
        {
          id: 'approved-entry',
          title: 'Receipt One',
          status: 'approved',
          statusLabel: 'Verified',
          filedLabel: 'Filed 7/16/2026',
          fieldNote: 'A real note.',
        },
        {
          id: 'needs-proof-entry',
          title: 'Receipt Two',
          status: 'needs_more_proof',
          statusLabel: 'Needs proof',
          filedLabel: 'Filed 7/16/2026',
          fieldNote: 'Needs another angle.',
          adminNote: 'Show the full object.',
          onRetry: noop,
        },
        {
          id: 'rejected-entry',
          title: 'Receipt Three',
          status: 'rejected',
          statusLabel: 'Retry required',
          filedLabel: 'Filed 7/16/2026',
          fieldNote: 'Try again.',
          onRetry: noop,
        },
      ],
      onOpenFullLogbook: noop,
    }),
  );

  // No CSS var is set in this environment, so the classic fallback applies:
  // black text on success green, warning brown, error red, and primary orange.
  assert.match(html, /Verified/);
  assert.match(html, /Needs proof/);
  assert.match(html, /Retry required/);
  assert.match(html, /need action/);
  assert.match(html, /Retry mission/);
  assert.doesNotMatch(html, /text-white/);
  assert.doesNotMatch(html, /text-\[var\(--skin-on-primary\)\]/);
  assert.ok(html.includes('style="color:#000000"'), 'expected derived black text in the logbook markup');
});

test('P0-2: action panel badge renders derived (not token) text color', () => {
  const html = renderToStaticMarkup(
    React.createElement(MissionActionPanel, {
      eyebrow: 'Current assignment',
      title: 'Find the strange sign',
      status: 'Pending review',
      children: React.createElement('p', null, 'Mission content'),
    }),
  );

  assert.match(html, /Pending review/);
  assert.doesNotMatch(html, /text-\[var\(--skin-on-secondary\)\]/);
  // Classic fallback: black text on the lime secondary.
  assert.ok(html.includes('style="color:#000000"'), 'expected derived black badge text in the action panel markup');
});
