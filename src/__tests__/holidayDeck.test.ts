import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import { HOLIDAY_CHALLENGE_BANK } from '../data/holidayChallengeBank';
import { getDeckPackById } from '../data/deckPacks';
import { getDeckAccess } from '../logic/deckAccess';
import { validateChallengeBrandFit } from '../services/brandService';
import {
  HOLIDAY_SEASON,
  HOLIDAY_SEASON_END_DATE,
  HOLIDAY_SEASON_START_DATE,
} from '../constants';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');

/**
 * Gobble & Glow (FT-07): the holiday seasonal deck — Thanksgiving and
 * winter holidays in one deck, seasonal gate Nov 1, 2026 – Jan 11, 2027.
 */
test('holiday deck is registered with 15 cards', () => {
  const pack = getDeckPackById('gobble-and-glow');
  assert.ok(pack, 'gobble-and-glow pack not registered');
  assert.equal(pack!.title, 'Gobble & Glow');
  assert.equal(pack!.deckCode, 'FT-07');
  assert.equal(pack!.totalCards, 15);
  assert.equal(pack!.deckType, 'seasonal');
  assert.equal(pack!.isSeasonal, true);
  assert.equal(pack!.missionIds.length, 15);
  const bankIds = new Set(HOLIDAY_CHALLENGE_BANK.map(card => String(card.id)));
  assert.equal(bankIds.size, 15, 'duplicate ids in holiday bank');
  for (const id of pack!.missionIds) {
    assert.ok(bankIds.has(String(id)), `pack mission ${id} missing from holiday bank`);
  }
  const registryIds = new Set(
    ALL_CHALLENGE_CARDS.filter(card => card.deckId === 'gobble-and-glow').map(card => String(card.id)),
  );
  assert.equal(registryIds.size, 15, 'holiday cards missing from canonical registry');
});

test('holiday deck carries the 11/1–1/11 seasonal gate', () => {
  const pack = getDeckPackById('gobble-and-glow');
  assert.equal(pack!.startsAt, HOLIDAY_SEASON_START_DATE);
  assert.equal(pack!.endsAt, HOLIDAY_SEASON_END_DATE);
  assert.equal(HOLIDAY_SEASON_START_DATE, '2026-11-01T00:00:00Z');
  assert.equal(HOLIDAY_SEASON_END_DATE, '2027-01-11T23:59:59Z');
});

test('holiday deck is playable inside its window for starter-complete players', () => {
  const pack = getDeckPackById('gobble-and-glow');
  const starterComplete = { profile: { completedDeckIds: ['starter-signals'] } as any };
  const inside = getDeckAccess(pack, { ...starterComplete, now: new Date('2026-12-01T12:00:00Z') });
  assert.equal(inside.playable, true, `expected playable inside window, got ${inside.reason}`);
  assert.equal(inside.locked, false);
});

test('holiday deck is locked outside its window', () => {
  const pack = getDeckPackById('gobble-and-glow');
  const starterComplete = { profile: { completedDeckIds: ['starter-signals'] } as any };
  const before = getDeckAccess(pack, { ...starterComplete, now: new Date('2026-10-31T23:59:59Z') });
  assert.equal(before.playable, false);
  assert.equal(before.locked, true);
  assert.equal(before.privateReason, 'access_window_not_started');
  const after = getDeckAccess(pack, { ...starterComplete, now: new Date('2027-01-12T00:00:00Z') });
  assert.equal(after.playable, false);
  assert.equal(after.locked, true);
  assert.equal(after.privateReason, 'access_window_ended');
});

test('holiday deck still requires the starter deck, admins bypass', () => {
  const pack = getDeckPackById('gobble-and-glow');
  const noStarter = getDeckAccess(pack, { profile: { completedDeckIds: [] } as any, now: new Date('2026-12-01T12:00:00Z') });
  assert.equal(noStarter.playable, false);
  assert.equal(noStarter.privateReason, 'missing_required_completed_deck');
  const admin = getDeckAccess(pack, { isAdmin: true, now: new Date('2026-10-15T12:00:00Z') });
  assert.equal(admin.playable, true);
});

test('holiday deck mixes 10 easy / 3 medium / 2 hard with matching XP', () => {
  const counts: Record<string, number> = {};
  for (const card of HOLIDAY_CHALLENGE_BANK) {
    counts[String(card.difficulty)] = (counts[String(card.difficulty)] || 0) + 1;
    const expectedXp = card.difficulty === 'easy' ? 100 : card.difficulty === 'medium' ? 125 : 150;
    assert.equal(Number(card.baseXP), expectedXp, `${card.id}: baseXP ${card.baseXP} for ${card.difficulty}`);
  }
  assert.deepEqual(counts, { easy: 10, medium: 3, hard: 2 });
});

test('exactly four holiday cards are specifically Thanksgiving', () => {
  // Zach's call (Nov 16): 4 Thanksgiving, 4 winter holidays, 7 fall/winter
  // seasonal. The thanksgiving tag marks the four.
  const thanksgiving = HOLIDAY_CHALLENGE_BANK.filter(card =>
    (card.tags || []).includes('thanksgiving'),
  ).map(card => String(card.id));
  assert.deepEqual(thanksgiving, ['holiday-01', 'holiday-02', 'holiday-03', 'holiday-04']);
});

test('holiday season constant spans 11 weeks, Nov 1 2026 – Jan 11 2027', () => {
  assert.equal(HOLIDAY_SEASON.id, 'gobble-and-glow');
  assert.equal(HOLIDAY_SEASON.title, 'GOBBLE_AND_GLOW');
  assert.equal(HOLIDAY_SEASON.weeks.length, 11);
  assert.equal(HOLIDAY_SEASON.weeks[0].fieldChallengeId, 'hg26_w1_field');
  assert.equal(HOLIDAY_SEASON.weeks[10].fieldChallengeId, 'hg26_w11_field');
});

test('all 15 holiday cards pass the brand check, so the deploy writes them approved', () => {
  // Nov 17: the deploy wrote all 15 to Firestore as 'draft' because the
  // brand check needs theAsk + levels.Advanced/Certified + proofNeeded +
  // a brand-vibe keyword, and the bank had none of the three fields.
  // A draft is undrawable, so the deck read "Deck Exhausted" at 0/15.
  for (const card of HOLIDAY_CHALLENGE_BANK) {
    assert.ok(card.theAsk && String(card.theAsk).trim().length > 0, `${card.id}: missing theAsk`);
    assert.ok(card.proofNeeded && String(card.proofNeeded).trim().length > 0, `${card.id}: missing proofNeeded`);
    assert.ok(card.levels?.Advanced?.description, `${card.id}: missing Advanced layer`);
    assert.ok(card.levels?.Certified?.description, `${card.id}: missing Certified layer`);
    assert.ok(card.levels?.Standard?.description, `${card.id}: missing Standard layer`);
    const check = validateChallengeBrandFit(card);
    assert.equal(check.status, 'approved', `${card.id}: brand check ${check.status} (${check.reason || 'no reason'})`);
  }
});

test('holiday deck cover art exists on disk', () => {
  assert.ok(
    fs.existsSync(path.join(root, 'public/assets/decks/gobble-and-glow.jpg')),
    'public/assets/decks/gobble-and-glow.jpg missing',
  );
});
