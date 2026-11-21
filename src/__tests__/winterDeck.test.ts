import assert from 'node:assert/strict';
import test from 'node:test';

import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import { WINTER_CHALLENGE_BANK } from '../data/winterChallengeBank';
import { getDeckPackById } from '../data/deckPacks';
import { getDeckAccess, getSeasonalLockCopy } from '../logic/deckAccess';
import { validateChallengeBrandFit } from '../services/brandService';

const WINTER = [...WINTER_CHALLENGE_BANK];
const EXPECTED_IDS = Array.from({ length: 20 }, (_, i) => `winter-${String(i + 1).padStart(2, '0')}`);

/**
 * Winter (FT-08): the winter seasonal deck — Dec 1 to Feb 28/29,
 * seasonId 'winter' (src/data/seasons.ts).
 *
 * This gate pins the bank and the registry only. Deck-pack registration
 * (deckPacks.ts, FT-08, cover art) is a separate slice and is NOT
 * asserted here.
 */
test('winter deck is registered as FT-08 with all 20 cards', () => {
  const pack = getDeckPackById('winter');
  assert.ok(pack, 'winter pack not registered');
  assert.equal(pack!.title, 'Winter');
  assert.equal(pack!.deckCode, 'FT-08');
  assert.equal(pack!.totalCards, 20);
  assert.equal(pack!.deckType, 'seasonal');
  assert.equal(pack!.isSeasonal, true);
  assert.equal(pack!.seasonId, 'winter');
  assert.equal(pack!.unlockRule, 'seasonal');
  assert.equal(pack!.catalogSection, 'featured-seasonal');
  assert.equal(pack!.missionIds.length, 20);
  const bankIds = new Set(WINTER_CHALLENGE_BANK.map(card => String(card.id)));
  assert.equal(bankIds.size, 20, 'duplicate ids in winter bank');
  for (const id of pack!.missionIds) {
    assert.ok(bankIds.has(String(id)), `pack mission ${id} missing from winter bank`);
  }
});

/** A Date on the given PT calendar day at noon PT (19:00 UTC). */
function ptDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 19, 0, 0));
}

test('winter deck is locked in fall with the derived copy, playable Dec 1–Feb 28', () => {
  const pack = getDeckPackById('winter');
  assert.ok(pack, 'winter pack not registered');
  const starterComplete = { profile: { id: 'u1', completedDeckIds: ['starter-signals'] } as any };
  // Fall (today, Nov 21, 2026): locked, visible teaser, derived copy.
  const fall = getDeckAccess(pack, { ...starterComplete, now: ptDate(2026, 11, 21) });
  assert.equal(fall.playable, false, 'winter should be locked in fall');
  assert.equal(fall.locked, true);
  assert.equal(fall.visible, true, 'locked seasonal deck must stay visible as a teaser');
  assert.equal(fall.privateReason, 'season_locked');
  assert.equal(fall.reason, 'Coming winter 2026');
  assert.equal(getSeasonalLockCopy('winter', ptDate(2026, 11, 21)), 'Coming winter 2026');
  // Inside the season: playable (Dec 1, Jan 15, Feb 28 boundary days).
  for (const date of [ptDate(2026, 12, 1), ptDate(2027, 1, 15), ptDate(2027, 2, 28)]) {
    const access = getDeckAccess(pack, { ...starterComplete, now: date });
    assert.equal(access.playable, true, `expected playable on ${date.toISOString()}, got ${access.reason}`);
    assert.equal(access.locked, false);
  }
  // Mar 1: the season is over, locked again with next year's copy.
  const spring = getDeckAccess(pack, { ...starterComplete, now: ptDate(2027, 3, 1) });
  assert.equal(spring.playable, false);
  assert.equal(spring.reason, 'Coming winter 2027');
});
test('winter bank holds exactly winter-01 through winter-20', () => {
  assert.deepEqual(WINTER.map(card => String(card.id)), EXPECTED_IDS);
  assert.equal(new Set(WINTER.map(card => String(card.id))).size, 20, 'duplicate ids in winter bank');
  for (const card of WINTER) {
    assert.equal(card.deckId, 'winter', `${card.id}: wrong deckId`);
    assert.equal(card.lane, 'seasonal', `${card.id}: wrong lane`);
    assert.equal(card.active, true, `${card.id}: not active`);
    assert.equal(card.status, 'approved', `${card.id}: not approved`);
  }
  const registryIds = new Set(
    ALL_CHALLENGE_CARDS.filter(card => card.deckId === 'winter').map(card => String(card.id)),
  );
  assert.equal(registryIds.size, 20, 'winter cards missing from canonical registry');
});

test('winter deck mixes 10 easy / 7 medium / 3 hard with matching XP', () => {
  const counts: Record<string, number> = {};
  for (const card of WINTER) {
    counts[String(card.difficulty)] = (counts[String(card.difficulty)] || 0) + 1;
    const expectedXp = card.difficulty === 'easy' ? 100 : card.difficulty === 'medium' ? 125 : 175;
    assert.equal(Number(card.baseXP), expectedXp, `${card.id}: baseXP ${card.baseXP} for ${card.difficulty}`);
  }
  assert.deepEqual(counts, { easy: 10, medium: 7, hard: 3 });
});

test('winter proof split: 15 photo-led, 2 audio, 3 hard combos, zero video', () => {
  const has = (card: (typeof WINTER)[number], proof: string) =>
    ((card.proofType as unknown as string[]) || []).includes(proof);
  // Photo-led: photo proof, no audio, not hard. The hard cards are their
  // own bucket (combos), so they are excluded here even though they are
  // photographed too.
  const photoLed = WINTER.filter(card => has(card, 'photo') && !has(card, 'audio') && card.difficulty !== 'hard');
  assert.equal(photoLed.length, 15, `expected 15 photo-led, got ${photoLed.map(c => String(c.id)).join(', ')}`);
  const audio = WINTER.filter(card => has(card, 'audio'));
  assert.deepEqual(audio.map(card => String(card.id)), ['winter-12', 'winter-13']);
  for (const card of audio) {
    assert.deepEqual(
      [...(card.proofType as unknown as string[])].sort(),
      card.id === 'winter-12'
        ? ['audio', 'group-confirmation', 'photo']
        : ['audio', 'photo'],
      `${card.id}: unexpected proofType`,
    );
    assert.ok(
      String(card.description).includes('voice note counts as your field note'),
      `${card.id}: audio card must say the voice note counts as the field note (Texas-07 pattern)`,
    );
  }
  const hard = WINTER.filter(card => card.difficulty === 'hard');
  assert.deepEqual(hard.map(card => String(card.id)), ['winter-18', 'winter-19', 'winter-20']);
  for (const card of hard) {
    // Every hard card is a combo: a place tag plus a second element
    // (an artifact, a crew check-in, or night).
    assert.ok(card.locationTag, `${card.id}: hard combo needs a locationTag`);
    const secondElement =
      (card.tags || []).includes('artifact') ||
      has(card, 'group-confirmation') ||
      (card.tags || []).includes('night');
    assert.ok(secondElement, `${card.id}: hard combo needs a second element beyond the place tag`);
  }
  assert.equal(WINTER.filter(card => has(card, 'video')).length, 0, 'no video cards: there is no video capture flow');
});

test('winter artifacts: 4 total, 3 of them photo-led', () => {
  const artifacts = WINTER.filter(card => (card.tags || []).includes('artifact'));
  assert.deepEqual(artifacts.map(card => String(card.id)), ['winter-01', 'winter-02', 'winter-11', 'winter-18']);
  const photoLedArtifacts = artifacts.filter(card => card.difficulty !== 'hard');
  assert.equal(photoLedArtifacts.length, 3);
  for (const card of artifacts) {
    assert.ok(
      (card.proofRequirements?.requiredSubjects || []).length > 0,
      `${card.id}: artifact card must name the thing in requiredSubjects`,
    );
  }
});

test('winter location tags: 5 place tags, all real SoCal winter spots', () => {
  const tagged = WINTER.filter(card => card.locationTag);
  assert.deepEqual(tagged.map(card => String(card.id)), ['winter-16', 'winter-17', 'winter-18', 'winter-19', 'winter-20']);
  for (const card of tagged) {
    assert.equal(card.locationTag!.kind, 'place', `${card.id}: winter tags are place tags, not state tags`);
    assert.ok(
      typeof card.locationTag!.latitude === 'number' && typeof card.locationTag!.longitude === 'number',
      `${card.id}: place tag needs coordinates`,
    );
    assert.ok(
      typeof card.locationTag!.radiusMeters === 'number' && card.locationTag!.radiusMeters > 0,
      `${card.id}: place tag needs a radius`,
    );
  }
});

test('winter crew-friendly: 5 group-confirmation cards', () => {
  const crew = WINTER.filter(card =>
    ((card.proofType as unknown as string[]) || []).includes('group-confirmation'),
  );
  assert.deepEqual(crew.map(card => String(card.id)), ['winter-12', 'winter-14', 'winter-15', 'winter-18', 'winter-20']);
});

test('all 20 winter cards pass the brand check, so the deploy writes them approved', () => {
  for (const card of WINTER) {
    assert.ok(card.theAsk && String(card.theAsk).trim().length > 0, `${card.id}: missing theAsk`);
    assert.ok(card.proofNeeded && String(card.proofNeeded).trim().length > 0, `${card.id}: missing proofNeeded`);
    assert.ok(card.levels?.Advanced?.description, `${card.id}: missing Advanced layer`);
    assert.ok(card.levels?.Certified?.description, `${card.id}: missing Certified layer`);
    assert.ok(card.levels?.Standard?.description, `${card.id}: missing Standard layer`);
    const check = validateChallengeBrandFit(card);
    assert.equal(check.status, 'approved', `${card.id}: brand check ${check.status} (${check.reason || 'no reason'})`);
  }
});

test('winter cards use the conventional exemplar image path', () => {
  for (const card of WINTER) {
    assert.equal(card.image, `/assets/challenges/${card.id}.jpg`, `${card.id}: unexpected image path`);
  }
});

test('winter user-facing copy has no em dashes (Trevor voice rule)', () => {
  for (const card of WINTER) {
    for (const field of ['title', 'shortPrompt', 'description', 'mission', 'theAsk'] as const) {
      assert.ok(
        !String(card[field] || '').includes('—'),
        `${card.id}: em dash in ${field}`,
      );
    }
  }
});
