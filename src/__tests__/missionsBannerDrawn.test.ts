import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('missions banner: no guidance banner while a mission is drawn and waiting', () => {
  const deck = read('src/pages/Deck.tsx');
  // Nov 17, 2026: in the drawn state the lime banner repeats the mission
  // name, the waiting state, and the resume action that the mission card
  // below already carries — so it is hidden in exactly that state.
  // Nov 18, 2026 (Zach's call, red-circled screenshot): the DRAW_MISSION
  // draw-another panel is hidden too — it duplicated the lime header draw
  // button and the deck tap.
  assert.match(deck, /guidance\.state !== 'RESUME_ACTIVE_MISSION' && guidance\.state !== 'DRAW_MISSION' && \(\s*<MissionsGuidanceStrip/s);
  // The hidden states are the plain resume/draw states, not the critical
  // recovery states: repair/retry still show the banner, because there
  // the strip IS the recovery guidance.
  assert.doesNotMatch(deck, /guidance\.state !== 'REPAIR_PROOF'[^]*<MissionsGuidanceStrip/s);
  assert.doesNotMatch(deck, /guidance\.state !== 'RETRY_REJECTED_PROOF'[^]*<MissionsGuidanceStrip/s);
  assert.doesNotMatch(deck, /!isDrawn && \(\s*<MissionsGuidanceStrip/s);
});

test('missions banner: the draw-another panel is gone, the draw paths remain', () => {
  // Nov 18, 2026: the circled panel (Now / DRAW ANOTHER MISSION / Ready
  // for another receipt. / View Proof Status / Draw Another Mission ->)
  // was the MissionsGuidanceStrip in the DRAW_MISSION state. It no longer
  // renders on Missions — but drawing still works three ways.
  const deck = read('src/pages/Deck.tsx');
  assert.doesNotMatch(deck, /guidance\.state !== 'RESUME_ACTIVE_MISSION' && \(\s*<MissionsGuidanceStrip/s);
  // 1. The lime header badge is a real draw button.
  assert.match(deck, /onDraw=\{!isDrawn && isNormalDrawBranch \? \(\) => handleDraw\(\) : undefined\}/);
  // 2. The deck itself is tappable.
  assert.match(deck, /<DeckStack[\s\S]*?onDraw=\{\(\) => handleDraw\(\)\}/);
  // 3. The guidance data still resolves DRAW_MISSION (Basecamp's compact
  // draw-another panel and Trevor both use it) — only the Missions-page
  // strip is gone.
  const guidance = read('src/logic/playerGuidance.ts');
  assert.match(guidance, /DRAW_MISSION: \{/);
  assert.match(guidance, /shortMessage: 'Ready for another receipt\.'/);
});

test('missions banner: the hidden state is the one whose copy the card duplicates', () => {
  const guidance = read('src/logic/playerGuidance.ts');
  assert.match(
    guidance,
    /RESUME_ACTIVE_MISSION:[\s\S]{0,600}shortMessage: 'Your mission is waiting\.'[\s\S]{0,300}actionLabel: 'Resume mission'/,
  );
});

test('missions banner: dropping it does not strand the player — resume lives in the Trevor guide', () => {
  const view = read('src/components/TrevorGuideView.tsx');
  // Nov 17, 2026, live-verified: the floating Resume pill opens the
  // Trevor field guide dialog, whose button runs the guidance's primary
  // action — that is the resume path once the banner is gone.
  assert.match(view, /onClick=\{\(\) => onAction\(recommendation\.primaryAction\)\}/);
  assert.match(view, /\{recommendation\.primaryAction\.label\}/);
  const guidance = read('src/logic/playerGuidance.ts');
  // In the drawn state that action is Resume mission → the briefing.
  assert.match(
    guidance,
    /RESUME_ACTIVE_MISSION:[\s\S]{0,600}actionLabel: 'Resume mission'/,
  );
  assert.match(
    guidance,
    /if \(mission\?\.status === 'drawn'\) \{\s*return \{ href: briefingHref\(missionId\), intent: 'navigate', missionId \};/s,
  );
  // The poster card itself still carries a start action for the mission.
  const card = read('src/components/MissionDecodedCard.tsx');
  assert.match(card, /getDisplayLabel\('DO_THIS_MISSION'\)/);
});

test('missions banner: the poster keys RESUME off real progress, not key-counting', () => {
  // Nov 17, 2026: the poster counted progress keys, so the valueless
  // entries the app writes itself ({ field_note: false }, { location: true })
  // read as "started". It now shares the guidance's real-progress test.
  const card = read('src/components/MissionDecodedCard.tsx');
  assert.match(card, /hasRealMissionProgress\(progress\)/);
  assert.doesNotMatch(card, /Object\.keys\(progress\)\.length/);
});

test('missions banner: the details modal feeds the poster real progress, not a blank', () => {
  // Nov 17, 2026: the modal blanked progress for a drawn trip ({}), so it
  // always said START even when the trip already had a photo/note — while
  // the poster beside it said RESUME. Both surfaces now get the same record.
  const deck = read('src/pages/Deck.tsx');
  assert.doesNotMatch(deck, /progress=\{drawnTrip \? \{\} : missionProgress\}/);
  assert.match(deck, /progress=\{profile\?\.tripProgress\?\.?\[\(drawnTrip \|\| activeTrip\)\?\.id\]\}/);
});

test('missions banner: the start-stage poster gets real progress too, so its checklist can light', () => {
  // Nov 17, 2026 (Long Table question): the start-stage poster passed NO
  // progress prop, so its REQUIREMENTS CHECKLIST could never light a pill —
  // even after a photo was taken, both pills stayed grey there, while the
  // details modal beside it showed the real state. Same record, both sites.
  const deck = read('src/pages/Deck.tsx');
  assert.ok(deck.includes('progress={profile?.tripProgress?.[(drawnTrip || launchMission)?.id]}'));
  const posterSites = [...deck.matchAll(/<MissionDecodedCard/g)].map((m) => m.index ?? 0);
  assert.equal(posterSites.length, 2, 'Deck renders exactly two poster instances');
  for (const at of posterSites) {
    assert.match(
      deck.slice(at, at + 500),
      /progress=\{profile\?\.tripProgress\?/,
      'every poster instance is fed real progress',
    );
  }
});
