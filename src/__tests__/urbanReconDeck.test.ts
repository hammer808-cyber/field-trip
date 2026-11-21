/**
 * URBAN RECON DECK (Nov 21, 2026; spec docs/urban-recon-location-adaptive-design.md).
 * The first location-adaptive deck: 20 skeleton cards, Action + Place +
 * Token, tiered place search (5 / 15 / 35 mi) with a generic-default
 * fallback. Decisions Nov 21: provider Google Places (key done), radii
 * 5/15/35, deck size 20, template Action + Place + Token. The skeleton
 * list is v1 — Zach said the cards can be strengthened later.
 *
 * Pins: 20 cards, XP ladder, every card carries action/token/generic
 * default, exactly two unslotted cards (Transit Rush, Mural Hunt),
 * time windows only on the two hard night/sunrise cards, crew tags
 * only on the two crew-friendly cards, no static locationTag (the tag
 * is per-draw), no card art yet (SVG fallback by design, like Gobble
 * & Glow), and the deck pack wiring (FT-09, evergreen, playable).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { URBAN_RECON_CHALLENGE_BANK } from '../data/urbanReconChallengeBank';
import { ALL_CHALLENGE_CARDS } from '../data/allChallengeBanks';
import { getDeckPackById } from '../data/deckPacks';

const bank = URBAN_RECON_CHALLENGE_BANK;

test('bank: 20 cards, ids urban-01..urban-20, all on the urban-recon deck', () => {
  assert.equal(bank.length, 20);
  const ids = bank.map((c) => c.id as string);
  assert.deepEqual(ids, Array.from({ length: 20 }, (_, i) => `urban-${String(i + 1).padStart(2, '0')}`));
  for (const card of bank) {
    assert.equal(card.deckId, 'urban-recon');
    assert.equal(card.active, true);
    assert.equal(card.status, 'approved');
  }
});

test('bank: XP ladder — 10 easy at 100, 7 medium at 125, 3 hard at 175', () => {
  const byDifficulty = { easy: 0, medium: 0, hard: 0 };
  for (const card of bank) {
    const expected = card.difficulty === 'easy' ? 100 : card.difficulty === 'medium' ? 125 : 175;
    assert.equal(card.baseXP, expected, `${card.id} ${card.difficulty} should be ${expected} XP`);
    byDifficulty[card.difficulty as keyof typeof byDifficulty] += 1;
  }
  assert.deepEqual(byDifficulty, { easy: 10, medium: 7, hard: 3 });
});

test('bank: every card carries Action + Place + Token (action/token/genericDefault)', () => {
  for (const card of bank) {
    const la = (card as { locationAdaptive?: { action?: string; token?: string; genericDefault?: string } }).locationAdaptive;
    assert.ok(la, `${card.id} must carry locationAdaptive`);
    assert.ok(typeof la.action === 'string' && la.action.length > 0, `${card.id} needs an action`);
    assert.ok(typeof la.token === 'string' && la.token.length > 0, `${card.id} needs a token`);
    assert.ok(typeof la.genericDefault === 'string' && la.genericDefault.length > 0, `${card.id} needs a genericDefault`);
  }
});

test('bank: exactly two unslotted cards (Transit Rush, Mural Hunt); the rest have a placeQuery', () => {
  const unslotted = bank.filter((c) => {
    const q = (c as { locationAdaptive?: { placeQuery?: unknown } }).locationAdaptive?.placeQuery;
    return !q;
  });
  assert.deepEqual(unslotted.map((c) => c.id), ['urban-05', 'urban-06']);
  const slotted = bank.filter((c) => c.id !== 'urban-05' && c.id !== 'urban-06');
  for (const card of slotted) {
    const q = (card as { locationAdaptive: { placeQuery: { googleType?: string; keyword?: string } } }).locationAdaptive.placeQuery;
    assert.ok(typeof q.googleType === 'string' || typeof q.keyword === 'string', `${card.id} needs a googleType or keyword`);
  }
});

test('bank: {place} appears in the mission text exactly on slotted cards', () => {
  for (const card of bank) {
    const hasSlot = (card.mission ?? '').includes('{place}') || (card.description ?? '').includes('{place}') || (card.shortPrompt ?? '').includes('{place}');
    if (card.id === 'urban-05' || card.id === 'urban-06') {
      assert.equal(hasSlot, false, `${card.id} is unslotted and must not carry {place}`);
    } else {
      assert.equal(hasSlot, true, `${card.id} is slotted and must carry {place} in its text`);
    }
  }
});

test('bank: time windows only on Lights After Dark (6 PM–6 AM) and Sunrise First Light (5–8 AM)', () => {
  const windowed = bank.filter((c) => c.proofRequirements?.timeWindow);
  assert.deepEqual(windowed.map((c) => c.id), ['urban-18', 'urban-20']);
  assert.deepEqual(
    bank.find((c) => c.id === 'urban-18')?.proofRequirements?.timeWindow,
    { startHour: 18, endHour: 6 },
  );
  assert.deepEqual(
    bank.find((c) => c.id === 'urban-20')?.proofRequirements?.timeWindow,
    { startHour: 5, endHour: 8 },
  );
});

test('bank: crew-friendly tags only on Night Market Bite and Taco Truck Run', () => {
  const crew = bank.filter((c) => (c.tags ?? []).includes('crew-friendly'));
  assert.deepEqual(crew.map((c) => c.id), ['urban-12', 'urban-14']);
});

test('bank: no static locationTag — the tag is per-draw, built from the resolved place', () => {
  for (const card of bank) {
    assert.equal((card as { locationTag?: unknown }).locationTag, undefined, `${card.id} must not carry a static locationTag`);
  }
});

test('bank: no card art yet — the SVG illustration fallback covers the deck, like Gobble & Glow', () => {
  for (const card of bank) {
    assert.equal((card as { image?: unknown }).image, undefined, `${card.id} has no art yet; add the image and update this pin when the art pass lands`);
  }
});

test('bank: every card is photo proof with a location + timestamp requirement', () => {
  for (const card of bank) {
    assert.deepEqual(card.proofType, ['photo']);
    assert.equal(card.proofRequirements?.requireLocation, true);
    assert.equal(card.proofRequirements?.requireTimestamp, true);
    assert.ok((card.proofRequirements?.requiredSubjects?.length ?? 0) >= 3, `${card.id} needs subjects for the photo check`);
  }
});

test('deck: urban-recon is FT-09, evergreen, playable, with all 20 mission ids', () => {
  const pack = getDeckPackById('urban-recon');
  assert.ok(pack, 'urban-recon pack must exist');
  assert.equal((pack as { deckCode?: string }).deckCode, 'FT-09');
  assert.equal((pack as { isFutureDrop?: boolean }).isFutureDrop, undefined);
  assert.equal((pack as { isEvergreen?: boolean }).isEvergreen, true);
  assert.equal((pack as { seasonId?: string }).seasonId, 'evergreen');
  assert.equal((pack as { unlockRule?: string }).unlockRule, 'starter-complete');
  assert.deepEqual(pack.missionIds, bank.map((c) => c.id));
  assert.equal((pack as { totalCards?: number }).totalCards, 20);
});

test('deck: all 20 cards are in the canonical bank (draw pool, resolver, admin tools)', () => {
  const allIds = new Set(ALL_CHALLENGE_CARDS.map((c) => c.id as string));
  for (const card of bank) {
    assert.ok(allIds.has(card.id as string), `${card.id} missing from ALL_CHALLENGE_CARDS`);
  }
});
