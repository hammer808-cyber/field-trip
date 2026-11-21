import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CLEAN_COMPLETION_MIN_ADMIN_SCORE,
  ERRAND_DECK_ID,
  FIELD_NOTE_MIN_LENGTH,
  LEGENDARY_MIN_XP_VALUE,
  UNDERDOG_MAX_APPROVED_COUNT,
  UNDERDOG_MAX_XP,
  assignWeeklyCategories,
  buildWeeklyCategoryBallotPlan,
  getWeeklyCategoryAdminScore,
  getWeeklyCategoryBallotId,
  getWeeklyCategoryFieldNote,
  getWeeklyCategoryFromBallotId,
  hasWeeklyCategoryPhotoProof,
  type WeeklyCategoryEntryLike,
  type WeeklyCategoryPlayerContext,
} from '../logic/weeklyCategories';
import { WEEKLY_VOTE_CATEGORIES } from '../logic/weeklyVoting';

/** A veteran with plenty of XP — rules fire on the entry, not the player. */
const VETERAN: WeeklyCategoryPlayerContext = { approvedCount: 12, xp: 2500 };
/** A brand-new player — underdog fires no matter what the entry looks like. */
const FIRST_TIMER: WeeklyCategoryPlayerContext = { approvedCount: 1, xp: 0 };

const PLAIN_ENTRY: WeeklyCategoryEntryLike = {
  fieldNote: 'Found it.',
  deckId: 'socal-summer',
  xpValue: 50,
  scoring: { normalizedRubricScore: 40 },
  proofImage: 'https://example.test/photo.jpg',
};

test('every entry lands in exactly 2 categories: best_photo_proof + one discriminating slot', () => {
  const assigned = assignWeeklyCategories(PLAIN_ENTRY, VETERAN);
  assert.deepEqual(assigned, ['best_photo_proof', 'goblin_energy_award']);
});

test('field-note threshold edge: 139 chars is not substantial, 140 is', () => {
  assert.equal(FIELD_NOTE_MIN_LENGTH, 140);
  const short = assignWeeklyCategories({ ...PLAIN_ENTRY, fieldNote: 'n'.repeat(139) }, VETERAN);
  assert.deepEqual(short, ['best_photo_proof', 'goblin_energy_award']);
  const exact = assignWeeklyCategories({ ...PLAIN_ENTRY, fieldNote: 'n'.repeat(140) }, VETERAN);
  assert.deepEqual(exact, ['best_photo_proof', 'best_field_note']);
});

test('field note falls back to Entry.note and trims whitespace', () => {
  assert.equal(getWeeklyCategoryFieldNote({ note: '  hello  ' }), 'hello');
  assert.equal(getWeeklyCategoryFieldNote({ fieldNote: '', note: 'n'.repeat(140) }), 'n'.repeat(140));
});

test('underdog fires for a first-timer and for a low-XP player, not for a veteran', () => {
  assert.equal(UNDERDOG_MAX_APPROVED_COUNT, 1);
  assert.equal(UNDERDOG_MAX_XP, 100);
  assert.deepEqual(assignWeeklyCategories(PLAIN_ENTRY, { approvedCount: 0, xp: 0 }), [
    'best_photo_proof',
    'underdog_award',
  ]);
  assert.deepEqual(assignWeeklyCategories(PLAIN_ENTRY, FIRST_TIMER), [
    'best_photo_proof',
    'underdog_award',
  ]);
  // Low XP alone is enough, even with several approvals.
  assert.deepEqual(assignWeeklyCategories(PLAIN_ENTRY, { approvedCount: 9, xp: 99 }), [
    'best_photo_proof',
    'underdog_award',
  ]);
  assert.deepEqual(assignWeeklyCategories(PLAIN_ENTRY, { approvedCount: 2, xp: 100 }), [
    'best_photo_proof',
    'goblin_energy_award',
  ]);
  // Underdog wins the priority tie-break over a long field note.
  assert.deepEqual(
    assignWeeklyCategories({ ...PLAIN_ENTRY, fieldNote: 'n'.repeat(200) }, FIRST_TIMER),
    ['best_photo_proof', 'underdog_award'],
  );
});

test('most_legendary_errand fires for the errand deck and for high-XP missions', () => {
  assert.equal(LEGENDARY_MIN_XP_VALUE, 200);
  assert.deepEqual(assignWeeklyCategories({ ...PLAIN_ENTRY, deckId: ERRAND_DECK_ID }, VETERAN), [
    'best_photo_proof',
    'most_legendary_errand',
  ]);
  assert.deepEqual(assignWeeklyCategories({ ...PLAIN_ENTRY, xpValue: 200 }, VETERAN), [
    'best_photo_proof',
    'most_legendary_errand',
  ]);
  assert.deepEqual(assignWeeklyCategories({ ...PLAIN_ENTRY, xpValue: 199 }, VETERAN), [
    'best_photo_proof',
    'goblin_energy_award',
  ]);
});

test('cleanest_completion fires at adminScore 80, not 79, and reads the normalized rubric score', () => {
  assert.equal(CLEAN_COMPLETION_MIN_ADMIN_SCORE, 80);
  assert.equal(getWeeklyCategoryAdminScore({ scoring: { normalizedRubricScore: 88 } }), 88);
  // Legacy fallbacks still resolve when the rubric score is absent.
  assert.equal(getWeeklyCategoryAdminScore({ adminScore: 85 }), 85);
  assert.equal(getWeeklyCategoryAdminScore({ scoring: { weightedRubricScore: 82 } }), 82);
  assert.equal(getWeeklyCategoryAdminScore({}), 0);
  assert.deepEqual(
    assignWeeklyCategories({ ...PLAIN_ENTRY, scoring: { normalizedRubricScore: 80 } }, VETERAN),
    ['best_photo_proof', 'cleanest_completion'],
  );
  assert.deepEqual(
    assignWeeklyCategories({ ...PLAIN_ENTRY, scoring: { normalizedRubricScore: 79 } }, VETERAN),
    ['best_photo_proof', 'goblin_energy_award'],
  );
});

test('goblin_energy_award is the deterministic fallback when no other rule claims the entry', () => {
  // No honest chaos signal exists on Entry, so this is the "fits nowhere
  // else" bucket — stated plainly in the module header, not invented data.
  assert.deepEqual(assignWeeklyCategories(PLAIN_ENTRY, VETERAN), [
    'best_photo_proof',
    'goblin_energy_award',
  ]);
});

test('1-2 guarantee holds across a matrix of entries and players', () => {
  const entries: WeeklyCategoryEntryLike[] = [
    PLAIN_ENTRY,
    { ...PLAIN_ENTRY, fieldNote: 'n'.repeat(500) },
    { ...PLAIN_ENTRY, deckId: ERRAND_DECK_ID },
    { ...PLAIN_ENTRY, xpValue: 250 },
    { ...PLAIN_ENTRY, scoring: { normalizedRubricScore: 100 } },
    { ...PLAIN_ENTRY, fieldNote: 'n'.repeat(500), deckId: ERRAND_DECK_ID, scoring: { normalizedRubricScore: 100 } },
    {},
  ];
  const players: WeeklyCategoryPlayerContext[] = [
    VETERAN,
    FIRST_TIMER,
    { approvedCount: 0, xp: 0 },
    { approvedCount: 50, xp: 99 },
    { approvedCount: 3, xp: 100 },
  ];
  for (const entry of entries) {
    for (const player of players) {
      const assigned = assignWeeklyCategories(entry, player);
      assert.ok(assigned.length >= 1 && assigned.length <= 2, `got ${assigned.length} for ${JSON.stringify({ entry, player })}`);
      assert.equal(new Set(assigned).size, assigned.length, 'no duplicate categories');
      for (const category of assigned) {
        assert.ok((WEEKLY_VOTE_CATEGORIES as readonly string[]).includes(category), `unknown category ${category}`);
      }
      assert.ok(assigned.includes('best_photo_proof'), 'base category always present');
    }
  }
});

test('photo-proof helper reflects the media eligibility already requires', () => {
  assert.equal(hasWeeklyCategoryPhotoProof(PLAIN_ENTRY), true);
  assert.equal(hasWeeklyCategoryPhotoProof({}), false);
  assert.equal(hasWeeklyCategoryPhotoProof({ storagePath: 'entries/x.jpg' }), true);
});

test('ballot ids encode the category and round-trip; the old single-ballot id parses to null', () => {
  const cycleId = '2026-W47';
  for (const category of WEEKLY_VOTE_CATEGORIES) {
    const ballotId = getWeeklyCategoryBallotId(cycleId, category);
    assert.ok(ballotId.includes(category), ballotId);
    assert.equal(getWeeklyCategoryFromBallotId(ballotId, cycleId), category);
  }
  assert.equal(getWeeklyCategoryFromBallotId(`${cycleId}_community_weekly`, cycleId), null);
  assert.equal(getWeeklyCategoryFromBallotId(`${cycleId}_community_weekly_nope`, cycleId), null);
  assert.equal(getWeeklyCategoryFromBallotId('2026-W48_community_weekly_best_photo_proof', cycleId), null);
});

test('build plan: six ballots, maxVotesPerVoter 1, each entry in exactly 2 ballots', () => {
  const plan = buildWeeklyCategoryBallotPlan({
    cycleId: '2026-W47',
    entries: [
      { id: 'entry-note', entry: { ...PLAIN_ENTRY, fieldNote: 'n'.repeat(200) }, playerContext: VETERAN },
      { id: 'entry-errand', entry: { ...PLAIN_ENTRY, deckId: ERRAND_DECK_ID }, playerContext: VETERAN },
      { id: 'entry-newbie', entry: PLAIN_ENTRY, playerContext: FIRST_TIMER },
      { id: 'entry-plain', entry: PLAIN_ENTRY, playerContext: VETERAN },
    ],
  });
  assert.equal(plan.length, 6);
  assert.deepEqual(plan.map((ballot) => ballot.category), [...WEEKLY_VOTE_CATEGORIES]);
  for (const ballot of plan) {
    assert.equal(ballot.maxVotesPerVoter, 1);
    assert.equal(ballot.ballotId, getWeeklyCategoryBallotId('2026-W47', ballot.category));
    assert.deepEqual(ballot.eligibleProofIds, ballot.entryIds);
  }
  const counts = new Map<string, number>();
  for (const ballot of plan) {
    for (const id of ballot.eligibleProofIds) counts.set(id, (counts.get(id) || 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(counts), {
    'entry-note': 2,
    'entry-errand': 2,
    'entry-newbie': 2,
    'entry-plain': 2,
  });
  const byCategory = new Map(plan.map((ballot) => [ballot.category, ballot.eligibleProofIds]));
  assert.deepEqual(byCategory.get('best_photo_proof'), [
    'entry-note',
    'entry-errand',
    'entry-newbie',
    'entry-plain',
  ]);
  assert.deepEqual(byCategory.get('best_field_note'), ['entry-note']);
  assert.deepEqual(byCategory.get('most_legendary_errand'), ['entry-errand']);
  assert.deepEqual(byCategory.get('underdog_award'), ['entry-newbie']);
  assert.deepEqual(byCategory.get('goblin_energy_award'), ['entry-plain']);
  assert.deepEqual(byCategory.get('cleanest_completion'), []);
});
