// Design elevation batch (Nov 27, 2026 — Zach's word, "Let's do those
// fixes"): (1) Big Board treatment to Basecamp + Profile, (2) paper/tape
// pass app-wide, (3) sticker tile contrast to AA, (4) AvatarPreview
// persona fallback, (5) big titles on Capture + result screens — pinned
// in journeyTokenMigration.test.ts, not duplicated here, (6)
// SignalCheckModal clearance. Style pass: pins are on the shipped
// source, plus a real render for #4 and a computed WCAG ratio for #3.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AvatarPreview } from '../components/AvatarPreview';
import { FIELD_TYPES, type FieldTypeId } from '../constants/fieldTypes';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const css = read('src/index.css');
const basecamp = read('src/pages/Basecamp.tsx');
const profile = read('src/pages/Profile.tsx');
const nextAction = read('src/components/basecamp/BasecampNextActionPanel.tsx');
const trevorsLog = read('src/components/basecamp/TrevorsLogCard.tsx');
const notifications = read('src/components/basecamp/BasecampNotifications.tsx');
const sticker = read('src/components/stickers/StickerCard.tsx');
const proofCard = read('src/components/CommunityProofCard.tsx');
const clipboard = read('src/components/FieldClipboard.tsx');

// --- #1: Big Board treatment on Basecamp + Profile -----------------------

test('#1 Basecamp + Profile carry their own page-scope classes', () => {
  assert.ok(basecamp.includes('basecamp-playful'), 'Basecamp root carries basecamp-playful');
  assert.ok(profile.includes('profile-playful'), 'Profile root carries profile-playful');
  // The Big Board scope is untouched and no page opts into another's scope.
  assert.ok(css.includes('.ft-dept-board.big-board-playful'), 'Big Board scope block still exists');
  assert.ok(!basecamp.includes('big-board-playful'));
  assert.ok(!profile.includes('big-board-playful'));
  assert.ok(!basecamp.includes('profile-playful'));
  assert.ok(!profile.includes('basecamp-playful'));
});

test('#1 Poppins remap + wash live in the new scope blocks', () => {
  for (const scope of ['.basecamp-playful', '.profile-playful']) {
    assert.ok(css.includes(scope), `${scope} block exists in index.css`);
  }
  // Poppins remaps for the non-title font utilities, same mechanism as
  // the Big Board scope.
  for (const utility of ['.font-sans', '.font-mono', '.font-serif']) {
    assert.ok(
      css.includes(`.basecamp-playful ${utility}`),
      `Basecamp scope remaps ${utility} to Poppins`,
    );
    assert.ok(
      css.includes(`.profile-playful ${utility}`),
      `Profile scope remaps ${utility} to Poppins`,
    );
  }
  // Soft brand-colour wash, token-based, on both pages.
  assert.ok(css.includes('.skin-basecamp.basecamp-playful'), 'Basecamp wash rule exists');
  assert.ok(css.includes('.ft-dept-profile.profile-playful'), 'Profile wash rule exists');
  assert.ok(css.includes('color-mix(in srgb, var(--color-brand-cyan)'), 'wash uses token colour pools');
});

test('#1 glass is on the Basecamp panels and the Profile folder body', () => {
  assert.ok(css.includes('.basecamp-playful .bb-glass'), 'bb-glass is scoped to Basecamp');
  assert.ok(css.includes('.profile-playful .bb-glass'), 'bb-glass is scoped to Profile');
  assert.ok(nextAction.includes('bb-glass'), 'NextActionPanel is glassed');
  assert.ok(trevorsLog.includes('bb-glass'), "Trevor's Log card is glassed");
  assert.ok(notifications.includes('bb-glass'), 'Basecamp notifications card is glassed');
  assert.ok(profile.includes('bb-glass'), 'Profile folder body is glassed');
  // Mobile blur stays cheap, as on the Big Board.
  assert.ok(css.includes('@media (max-width: 640px)'));
});

test('#1 the rest of the app stays on Inter', () => {
  assert.ok(!read('src/pages/Deck.tsx').includes('basecamp-playful'));
  assert.ok(!read('src/pages/Deck.tsx').includes('profile-playful'));
  assert.ok(!read('src/pages/Collection.tsx').includes('basecamp-playful'));
});

// --- #2: paper/tape pass -------------------------------------------------

test('#2 shared button classes are paper, tags are tape', () => {
  const block = (start: string) => {
    const at = css.indexOf(start);
    assert.ok(at >= 0, `${start} exists`);
    return css.slice(at, css.indexOf('}', at));
  };
  const btn = block('.bureau-btn {');
  assert.ok(btn.includes('bg-white text-on-surface'), 'bureau-btn is paper');
  assert.ok(btn.includes('hover:bg-brand-tape'), 'bureau-btn hovers to tape');
  assert.ok(!btn.includes('bg-on-surface'), 'bureau-btn has no ink base');
  const btnSm = block('.bureau-btn-sm {');
  assert.ok(btnSm.includes('bg-white text-on-surface'), 'bureau-btn-sm is paper');
  assert.ok(!btnSm.includes('bg-on-surface'), 'bureau-btn-sm has no ink base');
  const tag = block('.bureau-tag {');
  assert.ok(tag.includes('bg-brand-tape'), 'bureau-tag is tape stock');
  const cta = block('.field-cta {');
  assert.ok(cta.includes('background: #ffffff'), 'field-cta is paper, gradient gone');
  assert.ok(!cta.includes('linear-gradient'), 'field-cta gradient removed');
  // The skin overrides that painted buttons in the skin primary now
  // paint them with the skin paper instead.
  const journal = read('src/skins/fieldNotebook.css');
  assert.ok(journal.includes('background: var(--skin-surface) !important'), 'journal-skin buttons are paper');
  const wall = read('src/skins/clubhouseWall.css');
  assert.ok(wall.includes('background: var(--skin-surface) !important'), 'marker-label buttons are paper');
});

test('#2 a sample of player-facing buttons is paper', () => {
  // Capture submit (the button Zach taps to send proof).
  assert.ok(clipboard.includes('bg-white text-on-surface border-4 border-on-surface rounded-2xl'), 'Capture submit is paper');
  assert.ok(
    read('src/pages/MissionBriefing.tsx').includes('bg-white text-on-surface border-[4px] border-on-surface'),
    'Mission briefing CTA is paper',
  );
  assert.ok(
    read('src/components/DeckLibrary.tsx').includes('bg-white text-on-surface border-2 border-on-surface py-3'),
    'Deck start button is paper',
  );
  assert.ok(
    proofCard.includes('bg-white text-on-surface border-2 border-on-surface font-mono text-xs font-black uppercase disabled:opacity-50'),
    'Signal Check Send button is paper',
  );
  // The Basecamp next-action CTA follows the skin paper, not primary.
  assert.ok(nextAction.includes('bg-[var(--skin-surface)]'), 'Basecamp next CTA is paper');
  // The access-code Continue button uses the shared class now
  // (bureau-btn-huge was never defined, so it had no surface at all).
  const gate = read('src/pages/Auth/AccessCodeGate.tsx');
  assert.ok(!gate.includes('bureau-btn-huge'), 'undefined bureau-btn-huge is gone');
  assert.ok(gate.includes('bureau-btn'), 'access-code Continue uses bureau-btn');
});

test('#2 no bureau-btn call site still carries a colour override', () => {
  const offenders: string[] = [];
  const files = [
    'src/pages/Crew.tsx', 'src/pages/BigBoard.tsx', 'src/pages/VotingHubPage.tsx',
    'src/pages/Auth/SignIn.tsx', 'src/pages/Auth/SignUp.tsx',
    'src/components/ReportModal.tsx', 'src/components/ZineWorkspace.tsx',
    'src/components/crew/CrewPeopleHome.tsx', 'src/components/crew/CrewChallenges.tsx',
    'src/pages/PlayerPublicProfile.tsx',
  ];
  for (const file of files) {
    const src = read(file);
    for (const line of src.split('\n')) {
      if (!line.includes('bureau-btn')) continue;
      // Destructive reds are the documented exception (see the
      // deliberately-left test below): red is the meaning there.
      if (line.includes('bg-red-500')) continue;
      if (
        /bg-brand-|bg-on-surface(?!\/)|bg-mustard|text-white|text-paper/.test(line) &&
        !line.includes('bg-white')
      ) {
        offenders.push(`${file}: ${line.trim().slice(0, 90)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `colour overrides left on bureau-btn call sites:\n${offenders.join('\n')}`);
});

test('#2 controls deliberately left without the treatment', () => {
  // Missions page is frozen — its orange buttons stay.
  const deck = read('src/pages/Deck.tsx');
  assert.ok(deck.includes('bg-brand-orange'), 'Deck.tsx (frozen) keeps its orange buttons');
  // Destructive actions keep their red: it is the meaning.
  assert.ok(read('src/pages/Crew.tsx').includes('bg-red-500 text-white'), 'Crew remove/disband stay red');
  // State-indicating colour stays: the Hype button's liked state.
  assert.ok(proofCard.includes('liked ? "bg-brand-orange text-white" : "bg-white"'), 'Hype liked state stays orange');
  // Icon-only buttons have no text to sit on paper.
  assert.ok(
    read('src/pages/LoteriaExploreBoard.tsx').includes('bg-brand-lime shadow-[4px_4px_0_black]'),
    'Loteria icon-only button stays lime',
  );
  // Dev-only: the Capture QA debug button is a dark console control.
  assert.ok(read('src/pages/Capture.tsx').includes('[QA DBG]'), 'dev QA button untouched');
  // Admin-console one-offs keep their tinted filter chips.
  assert.ok(read('src/pages/AdminModeration.tsx').includes('bg-brand-green/20'), 'admin filter chips untouched');
});

// --- #3: sticker tile contrast -------------------------------------------

// WCAG relative luminance + contrast, computed in the test so the pin
// is the ratio, not a remembered number.
function luminance(r: number, g: number, b: number): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
function contrastRatio(
  fg: [number, number, number],
  bg: [number, number, number],
): number {
  const l1 = luminance(...fg);
  const l2 = luminance(...bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}
// Ink at a given opacity blended over the paper surface.
function blend(ink: [number, number, number], paper: [number, number, number], opacity: number): [number, number, number] {
  return ink.map((v, i) => Math.round(opacity * v + (1 - opacity) * paper[i])) as [number, number, number];
}

test('#3 sticker tile labels clear AA (>= 4.5:1)', () => {
  // Both labels sit at 80% ink now.
  const labelUses = sticker.match(/opacity-80/g) || [];
  assert.ok(labelUses.length >= 2, `archetype + Locked labels at opacity-80 (found ${labelUses.length})`);
  const ink: [number, number, number] = [0x11, 0x11, 0x11];
  const paper: [number, number, number] = [0xfc, 0xf9, 0xf2];
  // Before: archetype 55% (~4.17:1) and Locked 45% were below AA.
  assert.ok(contrastRatio(blend(ink, paper, 0.55), paper) < 4.5, 'old archetype 55% was below AA');
  assert.ok(contrastRatio(blend(ink, paper, 0.45), paper) < 4.5, 'old Locked 45% was below AA');
  // After: 80% ink on paper.
  const ratio = contrastRatio(blend(ink, paper, 0.8), paper);
  assert.ok(ratio >= 4.5, `80% ink on paper clears AA (computed ${ratio.toFixed(2)}:1)`);
  // Unlocked was already AA at 65% and stays.
  assert.ok(sticker.includes("opacity-65"), 'Unlocked label unchanged at 65%');
});

// --- #4: AvatarPreview fallback ------------------------------------------

test('#4 AvatarPreview renders persona art with no photoURL', () => {
  // No props at all: must not render blank.
  const bare = renderToStaticMarkup(React.createElement(AvatarPreview));
  assert.ok(bare.includes('/assets/characters/'), `bare AvatarPreview renders character art, got: ${bare.slice(0, 120)}`);
  assert.ok(!bare.includes('/assets/avatars/'), 'never points at the missing avatars dir');
  // Every persona resolves to its own character art.
  const ids: FieldTypeId[] = [
    'captainClipboard', 'mallRat', 'mascota', 'elondra', 'theGobbler', 'bigfoot', 'unclassified',
  ];
  for (const id of ids) {
    const html = renderToStaticMarkup(React.createElement(AvatarPreview, { fieldType: id }));
    assert.ok(
      html.includes(FIELD_TYPES[id].avatarPath),
      `${id} renders ${FIELD_TYPES[id].avatarPath}`,
    );
  }
});

test('#4 photoURL wins when present', () => {
  const html = renderToStaticMarkup(
    React.createElement(AvatarPreview, { photoURL: 'https://example.com/me.jpg', fieldType: 'elondra' }),
  );
  assert.ok(html.includes('https://example.com/me.jpg'), 'photoURL renders when present');
});

// --- #6: SignalCheckModal clearance --------------------------------------

test('#6 SignalCheckModal scrolls and its Send button clears the pill', () => {
  // The SignalCheckModal panel (line ~381) scrolls within the viewport,
  // and both modals in this file carry the 192px bottom spacer from the
  // Nov 22 receipt-modal fix, so the action clears the bottom nav +
  // DO THIS MISSION pill on short phones.
  const modalAt = proofCard.indexOf('function SignalCheckModal');
  assert.ok(modalAt >= 0, 'SignalCheckModal exists');
  const modalBody = proofCard.slice(modalAt);
  assert.ok(
    modalBody.includes('max-h-[calc(100dvh-2rem)] overflow-y-auto'),
    'SignalCheckModal panel scrolls within the viewport',
  );
  assert.ok(modalBody.includes('h-48 lg:hidden'), 'SignalCheckModal has the 192px bottom spacer');
  const spacerUses = proofCard.match(/h-48 lg:hidden/g) || [];
  assert.ok(spacerUses.length >= 2, `both modals have the spacer (found ${spacerUses.length})`);
  assert.ok(proofCard.includes('Send Signal'), 'Send Signal button is in the modal');
});
