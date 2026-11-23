/**
 * Crew Challenges picker (Nov 23, 2026).
 *
 * Pins the inventory (every playable crew card, none missing), the deck
 * grouping and lock verdicts, the render (locked cards show locked with
 * no start button, startable cards show a Do this button, completed
 * cards show Logged), the wiring (Challenges tab in both Crew branches,
 * the memories-feed button repointed, the start path to Capture), and
 * the P2 guards on the new files.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import { DECK_PACKS } from '../data/deckPacks';
import { resolveMissionById } from '../logic/missionResolver';
import {
  buildCrewChallengeSections,
  crewProofLabels,
  crewLayerNote,
  getCrewChallengeCards,
} from '../logic/crewChallenges';
import type { DeckAccessResult } from '../logic/deckAccess';
import { CrewChallenges } from '../components/crew/CrewChallenges';

const read = (path: string) => readFileSync(path, 'utf8');

const EXPECTED_CREW_PROOF = ['winter-12', 'winter-14', 'winter-15', 'winter-18', 'winter-20'];
const EXPECTED_LEGACY = [
  'heatwave-12', 'heatwave-13', 'heatwave-14', 'heatwave-15', 'heatwave-16',
  'jet-setter-12', 'jet-setter-13', 'jet-setter-14', 'jet-setter-15', 'jet-setter-16',
  'errand-deck-07', 'errand-deck-08', 'errand-deck-09',
];

function fakeAccess(playable: boolean, reason = ''): DeckAccessResult {
  return {
    deckId: 'fake',
    visibility: 'public',
    visible: true,
    playable,
    locked: !playable,
    reason,
  };
}

test('inventory: 5 crew proof cards and 13 legacy Crew Challenge cards, none missing', () => {
  const { crewProof, legacy } = getCrewChallengeCards();
  assert.deepEqual(crewProof.map(card => card.id).sort(), [...EXPECTED_CREW_PROOF].sort());
  assert.deepEqual(legacy.map(card => card.id).sort(), [...EXPECTED_LEGACY].sort());
  assert.equal(crewProof.length + legacy.length, 18);
  // Every one comes from the playable pool, so the picker cannot drift
  // from what the draw can serve.
  for (const card of [...crewProof, ...legacy]) {
    assert.ok(ALL_CHALLENGE_CARDS.some(pool => pool.id === card.id), `${card.id} is not in ALL_CHALLENGE_CARDS`);
    assert.notEqual(card.active, false, `${card.id} is inactive`);
  }
});

test('inventory: every crew card resolves by id, so /capture?id=<id> opens it', () => {
  for (const id of [...EXPECTED_CREW_PROOF, ...EXPECTED_LEGACY]) {
    const mission = resolveMissionById(id);
    assert.ok(mission, `${id} does not resolve`);
    assert.equal(mission!.id, id);
  }
});

test('inventory: crew proof cards carry group-confirmation, legacy cards do not', () => {
  const { crewProof, legacy } = getCrewChallengeCards();
  for (const card of crewProof) {
    assert.ok((card.proofType || []).includes('group-confirmation'), `${card.id} is not group-confirmation`);
    assert.match(crewLayerNote(card), /\+25%/, `${card.id} has no crew layer note`);
  }
  for (const card of legacy) {
    assert.ok(!(card.proofType || []).includes('group-confirmation'), `${card.id} carries group-confirmation`);
    assert.match(crewLayerNote(card), /does not pay/, `${card.id} promises a crew layer it does not pay`);
    assert.deepEqual(card.proofType, ['photo']);
  }
});

test('inventory: proof labels and location labels read plain', () => {
  const { crewProof } = getCrewChallengeCards();
  const carolers = crewProof.find(card => card.id === 'winter-12')!;
  assert.deepEqual(crewProofLabels(carolers), ['Photo', 'Voice note', 'Crew in frame']);
  const snowball = crewProof.find(card => card.id === 'winter-14')!;
  assert.deepEqual(crewProofLabels(snowball), ['Photo', 'Crew in frame']);
  const summit = crewProof.find(card => card.id === 'winter-18')!;
  assert.equal((summit.locationTag as any)?.label, 'Snow Summit, Big Bear Lake');
  const rink = crewProof.find(card => card.id === 'winter-20')!;
  assert.equal((rink.locationTag as any)?.label, 'Pershing Square, Los Angeles');
});

test('sections: four decks in catalog order, winter locked, the rest playable', () => {
  const sections = buildCrewChallengeSections({
    packs: DECK_PACKS,
    getAccess: (pack) => {
      const id = String(pack?.packId || pack?.id || pack?.deckId || '');
      if (id === 'winter') return fakeAccess(false, 'Coming winter 2026');
      if (id === 'heatwave-receipts') return fakeAccess(false, 'Coming summer 2027');
      return fakeAccess(true);
    },
  });
  assert.deepEqual(sections.map(section => section.deckId), ['heatwave-receipts', 'winter', 'jet-setter', 'errand-deck']);
  assert.deepEqual(sections.map(section => section.cards.length), [5, 5, 5, 3]);
  const winter = sections.find(section => section.deckId === 'winter')!;
  assert.equal(winter.locked, true);
  assert.equal(winter.lockReason, 'Coming winter 2026');
  assert.equal(winter.deckCode, 'FT-08');
  const heatwave = sections.find(section => section.deckId === 'heatwave-receipts')!;
  assert.equal(heatwave.locked, true);
  assert.equal(heatwave.lockReason, 'Coming summer 2027');
  for (const deckId of ['jet-setter', 'errand-deck']) {
    const section = sections.find(s => s.deckId === deckId)!;
    assert.equal(section.locked, false, `${deckId} should be playable`);
  }
});

test('sections: a hidden deck is left out, a completed card is flagged', () => {
  const sections = buildCrewChallengeSections({
    packs: DECK_PACKS,
    getAccess: (pack) => {
      const id = String(pack?.packId || pack?.id || pack?.deckId || '');
      if (id === 'heatwave-receipts') return { ...fakeAccess(false, 'Hidden'), visible: false };
      return fakeAccess(true);
    },
    completedIds: new Set(['jet-setter-12']),
  });
  assert.deepEqual(sections.map(section => section.deckId), ['winter', 'jet-setter', 'errand-deck']);
  const jetSetter = sections.find(section => section.deckId === 'jet-setter')!;
  assert.equal(jetSetter.cards.find(card => card.id === 'jet-setter-12')!.completed, true);
  assert.equal(jetSetter.cards.find(card => card.id === 'jet-setter-13')!.completed, false);
});

test('sections: a card with a time window shows the window label', () => {
  const sections = buildCrewChallengeSections({
    cards: [
      {
        id: 'winter-19',
        deckId: 'winter',
        title: 'Lights After Dark',
        difficulty: 'hard',
        baseXP: 175,
        proofType: ['photo', 'group-confirmation'],
        proofRequirements: { timeWindow: { startHour: 18, endHour: 6 } },
        active: true,
      } as any,
    ],
    packs: DECK_PACKS,
    getAccess: () => fakeAccess(true),
  });
  assert.equal(sections.length, 1);
  assert.equal(sections[0].cards[0].timeWindowLabel, 'Only open 6 PM–6 AM');
});

function renderSections() {
  const sections = buildCrewChallengeSections({
    packs: DECK_PACKS,
    getAccess: (pack) => {
      const id = String(pack?.packId || pack?.id || pack?.deckId || '');
      if (id === 'winter') return fakeAccess(false, 'Coming winter 2026');
      if (id === 'heatwave-receipts') return fakeAccess(false, 'Coming summer 2027');
      return fakeAccess(true);
    },
    completedIds: new Set(['jet-setter-12']),
  });
  const html = renderToStaticMarkup(<CrewChallenges sections={sections} onStart={() => {}} />);
  return { sections, html };
}

test('render: locked decks show locked with the reason and no start button', () => {
  const { html } = renderSections();
  assert.ok(html.includes('Locked: Coming winter 2026'), 'winter lock reason is missing');
  assert.ok(html.includes('Locked: Coming summer 2027'), 'heatwave lock reason is missing');
  for (const id of [...EXPECTED_CREW_PROOF, 'heatwave-12', 'heatwave-13', 'heatwave-14', 'heatwave-15', 'heatwave-16']) {
    assert.ok(!html.includes(`data-card-id="${id}" data-testid="crew-challenge-start"`) && !html.includes(`data-testid="crew-challenge-start" data-card-id="${id}"`), `${id} has a start button while locked`);
  }
  // The locked stamp is decorative (aria-hidden); the plain Locked text
  // is what carries the state.
  assert.ok(html.includes('>Locked<'), 'no plain Locked text on locked rows');
});

test('render: startable cards show a Do this button, completed cards show Logged', () => {
  const { html } = renderSections();
  for (const id of ['jet-setter-13', 'jet-setter-14', 'errand-deck-07', 'errand-deck-08', 'errand-deck-09']) {
    assert.ok(html.includes(`data-card-id="${id}"`), `${id} row is missing`);
  }
  const startButtons = (html.match(/data-testid="crew-challenge-start"/g) || []).length;
  // 8 startable cards (jet-setter 5 + errand 3) minus 1 completed.
  assert.equal(startButtons, 7);
  assert.ok(html.includes('Do this'), 'no Do this button');
  assert.ok(html.includes('>Logged<'), 'completed card has no Logged text');
  assert.ok(!html.includes('data-card-id="jet-setter-12" data-testid="crew-challenge-start"') && !html.includes('data-testid="crew-challenge-start" data-card-id="jet-setter-12"'), 'completed card has a start button');
});

test('render: crew layer note, location labels, and deck counts read plain', () => {
  const { html } = renderSections();
  assert.ok(html.includes('Crew check-in pays +25% of base when submitted as crew.'), 'crew proof note is missing');
  assert.ok(html.includes('Photo proof only, so the crew layer does not pay on this one.'), 'legacy note is missing');
  assert.ok(html.includes('Near Snow Summit, Big Bear Lake. The tag pays the location layer. It never blocks a submit.'), 'location note is missing');
  assert.ok(html.includes('18 crew cards. 7 ready to start.'), 'header counts are wrong');
  assert.ok(html.includes('FT-08 / 5 crew cards'), 'winter deck header is wrong');
});

test('wiring: Challenges tab exists in both Crew branches and the feed button is repointed', () => {
  const crew = read('src/pages/Crew.tsx');
  assert.ok(crew.includes("'home', 'feed', 'chat', 'voting', 'zine', 'members', 'challenges', 'stats', 'settings'"), 'challenges is not in CREW_TAB_IDS');
  assert.ok(crew.includes("{ id: 'challenges', label: 'Challenges', icon: Trophy }"), 'challenges tab is missing from the tabs array');
  assert.ok(crew.includes("{activeTab === 'challenges' && ("), 'crew-branch challenges panel is missing');
  assert.ok(crew.includes("useState<'company' | 'challenges'>"), 'no-crew tab state is missing');
  assert.ok(crew.includes("tabs={[{ id: 'company', label: 'Crew Company' }, { id: 'challenges', label: 'Challenges' }]}"), 'no-crew hero tabs are missing');
  assert.ok(crew.includes("{noCrewTab === 'company' ? ("), 'no-crew conditional body is missing');
  assert.equal((crew.match(/<CrewChallengesPanel \/>/g) || []).length, 2, 'panel is not rendered in both branches');
  const feed = read('src/components/CrewMemoriesFeed.tsx');
  assert.ok(feed.includes("navigate('/crew?tab=challenges')"), 'View Crew Challenges still points at /crew');
  assert.ok(!feed.includes("navigate('/crew')"), 'old dead-end navigate is still in the feed');
});

test('wiring: starting a card navigates to Capture with the card id', () => {
  const challenges = read('src/components/crew/CrewChallenges.tsx');
  assert.ok(challenges.includes('navigate(`/capture?id=${cardId}`)'), 'start does not navigate to /capture?id=');
});

test('P2 guards: no hard-coded hex and no em dashes in the new files', () => {
  assert.doesNotMatch(read('src/logic/crewChallenges.ts'), /#[0-9a-fA-F]{3,8}\b/, 'crewChallenges.ts has a hard-coded hex');
  assert.doesNotMatch(read('src/components/crew/CrewChallenges.tsx'), /#[0-9a-fA-F]{3,8}\b/, 'CrewChallenges.tsx has a hard-coded hex');
  assert.ok(!read('src/logic/crewChallenges.ts').includes('—'), 'crewChallenges.ts has an em dash');
  assert.ok(!read('src/components/crew/CrewChallenges.tsx').includes('—'), 'CrewChallenges.tsx has an em dash');
  // The test file itself needs the em dash character in the two lines
  // above to test for it, so those lines are excluded from its own check.
  const testSource = read('src/__tests__/crewChallenges.test.tsx')
    .split('\n')
    .filter(line => !line.includes(".includes('—')"))
    .join('\n');
  assert.ok(!testSource.includes('—'), 'test file has an em dash outside the guard assertions');
});
