import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeeklyCycleConfig } from '../logic/weeklyCycleLogic';
import {
  WEEKLY_CONSENSUS_XP,
  WEEKLY_WINNER_XP,
  getLegacyWeeklyWinnerAwardEventId,
  getWeeklyConsensusAwardEventId,
  getWeeklyConsensusVoterIds,
  getWeeklyWinnerAwardEventId,
  isWeeklyFinalizeDue,
} from '../logic/weeklyFinalize';
import { getWeeklyCategoryBallotId } from '../logic/weeklyCategories';
import { WEEKLY_VOTE_CATEGORIES } from '../logic/weeklyVoting';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

/** Saturday Nov 21, 2026 12:00 PT — inside the voting window (voting ends Sat 23:59:59.999 PT). */
const SAT_NOON_PT = new Date('2026-11-21T12:00:00-08:00').getTime();
/** Sunday Nov 22, 2026 10:00 PT — past the window close, past the 09:00 results publish time. */
const SUN_10AM_PT = new Date('2026-11-22T10:00:00-08:00').getTime();
/** Sunday Nov 22, 2026 00:30 PT — past the Saturday close, before results publish. Lazy finalize is still due: the trigger is the window close, not the publish time. */
const SUN_0030_PT = new Date('2026-11-22T00:30:00-08:00').getTime();

test('winner XP matches config (100) and consensus XP matches config (20)', () => {
  const config = buildWeeklyCycleConfig(Date.now(), 'heatwave-receipts', [...WEEKLY_VOTE_CATEGORIES]);
  assert.equal(config.bonus?.winnerXp, 100);
  assert.equal(config.bonus?.consensusXp, 20);
  assert.equal(WEEKLY_WINNER_XP, 100);
  assert.equal(WEEKLY_CONSENSUS_XP, 20);
  assert.equal(WEEKLY_WINNER_XP, config.bonus?.winnerXp);
  assert.equal(WEEKLY_CONSENSUS_XP, config.bonus?.consensusXp);
});

test('winner award event ids are deterministic and distinct per ballot — no double-pay collision', () => {
  const cycleId = '2026-W47';
  const userId = 'winner-user';
  const photoBallot = getWeeklyCategoryBallotId(cycleId, 'best_photo_proof');
  const noteBallot = getWeeklyCategoryBallotId(cycleId, 'best_field_note');
  // Same user winning two category ballots must NOT collide: the
  // pre-Slice-1 id had no ballot id, so the second win deduped as a
  // "duplicate" and the player was paid once for two wins.
  const photoWin = getWeeklyWinnerAwardEventId(cycleId, photoBallot, userId);
  const noteWin = getWeeklyWinnerAwardEventId(cycleId, noteBallot, userId);
  assert.notEqual(photoWin, noteWin);
  assert.equal(photoWin, getWeeklyWinnerAwardEventId(cycleId, photoBallot, userId));
  // The legacy id (no ballot) is different from both new ids — the
  // already-finalized branch uses it only as a transition check.
  const legacy = getLegacyWeeklyWinnerAwardEventId(cycleId, userId, 'community_weekly', null);
  assert.notEqual(legacy, photoWin);
  assert.notEqual(legacy, noteWin);
});

test('consensus award event ids are deterministic and distinct per voter per ballot', () => {
  const a = getWeeklyConsensusAwardEventId('2026-W47', 'b1', 'voter-a', 'entry-1');
  assert.equal(a, getWeeklyConsensusAwardEventId('2026-W47', 'b1', 'voter-a', 'entry-1'));
  assert.notEqual(a, getWeeklyConsensusAwardEventId('2026-W47', 'b1', 'voter-b', 'entry-1'));
  assert.notEqual(a, getWeeklyConsensusAwardEventId('2026-W47', 'b2', 'voter-a', 'entry-1'));
});

test('consensus voters are exactly the voters who picked the winner, deduped', () => {
  const voters = getWeeklyConsensusVoterIds(
    [
      { voterId: 'a', selectedProofIds: ['entry-1'] },
      { voterId: 'b', selectedProofIds: ['entry-2'] },
      { voterId: 'c', selectedProofIds: ['entry-2', 'entry-1'] },
      { voterId: 'a', selectedProofIds: ['entry-1'] },
    ],
    'entry-1',
  );
  assert.deepEqual(voters.sort(), ['a', 'c']);
  assert.deepEqual(getWeeklyConsensusVoterIds([], 'entry-1'), []);
});

test('lazy finalize is due only after Saturday close with a built ballot missing results', () => {
  const ballots = WEEKLY_VOTE_CATEGORIES.map((category) =>
    getWeeklyCategoryBallotId('2026-W47', category),
  );
  // Voting window still open (Saturday noon): not due.
  assert.deepEqual(
    isWeeklyFinalizeDue({ nowMs: SAT_NOON_PT, votingEndsAtMs: new Date('2026-11-21T23:59:59.999-08:00').getTime(), existingBallotIds: ballots, finalizedBallotIds: [] }),
    { due: false, reason: 'voting_window_open' },
  );
  // Exactly at the close: not due (must be past it).
  const closeMs = new Date('2026-11-21T23:59:59.999-08:00').getTime();
  assert.deepEqual(
    isWeeklyFinalizeDue({ nowMs: closeMs, votingEndsAtMs: closeMs, existingBallotIds: ballots, finalizedBallotIds: [] }),
    { due: false, reason: 'voting_window_open' },
  );
  // Past the close, no ballots built at all: not due — admin build is the repair path.
  assert.deepEqual(
    isWeeklyFinalizeDue({ nowMs: SUN_0030_PT, votingEndsAtMs: closeMs, existingBallotIds: [], finalizedBallotIds: [] }),
    { due: false, reason: 'no_community_ballots' },
  );
  // Past the close, one ballot missing results: due (even before the 09:00 publish time).
  assert.deepEqual(
    isWeeklyFinalizeDue({ nowMs: SUN_0030_PT, votingEndsAtMs: closeMs, existingBallotIds: ballots, finalizedBallotIds: ballots.slice(1) }),
    { due: true, reason: 'due' },
  );
  // Past the close, all six finalized: not due.
  assert.deepEqual(
    isWeeklyFinalizeDue({ nowMs: SUN_10AM_PT, votingEndsAtMs: closeMs, existingBallotIds: ballots, finalizedBallotIds: ballots }),
    { due: false, reason: 'already_finalized' },
  );
});

/**
 * Source-shape pins. The vote/build/finalize endpoints live inline in
 * server.ts (no HTTP harness exists for them), so these pin the wiring
 * the same way milestoneBundleOnApproval.test.ts does: the server must
 * actually call the pure modules and the canonical vote must stay a
 * merge-set (replaceable), not a create (immutable).
 */
test('server: build endpoint writes six category ballots from the rules module, maxVotesPerVoter 1', () => {
  const server = read('server.ts');
  assert.ok(server.includes('buildWeeklyCategoryBallotPlan'), 'build must use the category ballot plan');
  assert.ok(server.includes('getWeeklyCategoryBallotId'), 'build must use category-encoded ballot ids');
  assert.ok(server.includes('assignWeeklyCategories'), 'build must assign categories via the rules module');
  const buildSection = server.slice(
    server.indexOf('/api/admin/voting/build-weekly-ballot'),
    server.indexOf('/api/admin/voting/finalize-week'),
  );
  assert.ok(buildSection.includes('maxVotesPerVoter: 1'), 'category ballots must allow exactly 1 vote per voter');
  assert.ok(
    buildSection.includes('eligibleProofIds: categoryPlan.eligibleProofIds'),
    'each category ballot must carry its own per-category eligibleProofIds list',
  );
  // The old every-entry-in-every-category assignment survives only
  // inside the fenced legacy block (kept, not deleted) — it must sit
  // after the fence opens, never on the live path.
  const fenceAt = buildSection.indexOf('if (WRITE_LEGACY_WEEKLY_BALLOT_COPIES)');
  const oldAssignAt = buildSection.indexOf('categoryCandidateMap[category] = eligibleEntries.map');
  assert.ok(fenceAt > 0, 'legacy writers must be fenced');
  assert.ok(oldAssignAt > fenceAt, 'the old all-categories assignment must live only inside the legacy fence');
});

test('server: legacy weeklyBallots/flat writes are fenced off, not deleted', () => {
  const server = read('server.ts');
  assert.ok(
    server.includes('WRITE_LEGACY_WEEKLY_BALLOT_COPIES = false'),
    'legacy writes must be fenced behind an explicit off flag',
  );
  assert.ok(server.includes('weeklyBallots'), 'legacy code stays in the file for old-data reads');
  const buildSection = server.slice(
    server.indexOf('/api/admin/voting/build-weekly-ballot'),
    server.indexOf('/api/admin/voting/finalize-week'),
  );
  assert.ok(
    buildSection.includes('if (WRITE_LEGACY_WEEKLY_BALLOT_COPIES)'),
    'the legacy writers must sit inside the fence, not on the live path',
  );
});

test('server: canonical vote stays replaceable (merge-set), never immutable create', () => {
  const server = read('server.ts');
  const voteSection = server.slice(
    server.indexOf('/api/voting/weekly/vote'),
    server.indexOf('/api/admin/voting/build-weekly-ballot'),
  );
  assert.ok(
    voteSection.includes('transaction.set(voteRef, voteData, { merge: true })'),
    'canonical vote must merge-set so a voter can replace their pick',
  );
  assert.ok(
    voteSection.includes("status: existingVoteSnap.exists ? 'replaced' : 'submitted'"),
    'a re-vote must be marked replaced with the original submittedAt preserved',
  );
});

test('server: finalize pays WEEKLY_WINNER_XP (100) and consensus WEEKLY_CONSENSUS_XP (20), never 25', () => {
  const server = read('server.ts');
  const finalizeSection = server.slice(
    server.indexOf('/api/admin/voting/finalize-week'),
    server.indexOf('/api/admin/voting/void-vote'),
  );
  assert.ok(finalizeSection.includes('WEEKLY_WINNER_XP'), 'finalize must use the shared winner-XP constant');
  assert.ok(finalizeSection.includes('WEEKLY_CONSENSUS_XP'), 'canonical finalize must pay consensus XP');
  assert.ok(!finalizeSection.includes('points: 25'), 'no finalize award may still pay the old 25 XP');
  // The canonical finalize lives in the extracted
  // runCanonicalWeeklyFinalize helper (shared with the lazy endpoint),
  // so the event-id wiring is pinned there, not in the handler body.
  const helperSection = server.slice(
    server.indexOf('const runCanonicalWeeklyFinalize'),
    server.indexOf('/api/admin/voting/finalize-week'),
  );
  assert.ok(helperSection.includes('getWeeklyWinnerAwardEventId'), 'winner awards must use the ballot-scoped event id');
  assert.ok(
    helperSection.includes('getWeeklyConsensusAwardEventId'),
    'consensus awards must use the ballot-scoped event id',
  );
  assert.ok(
    finalizeSection.includes('runCanonicalWeeklyFinalize'),
    'the admin finalize handler must call the shared helper',
  );
  // Idempotency guard: a ballot with an isFinal result is never recomputed.
  // (Checked in the shared helper, not the handler body.)
  assert.ok(
    helperSection.includes("existingResult.data()?.isFinal === true"),
    'finalize must re-check isFinal before recomputing a ballot',
  );
});

test('server: approval auto-populates draft ballots best-effort and never fails the approval', () => {
  const server = read('server.ts');
  assert.ok(
    server.includes('addApprovedEntryToWeeklyDraftBallots'),
    'server must have the approval auto-populate helper',
  );
  const reviewSection = server.slice(
    server.indexOf('/api/admin/proof-review/action'),
    server.indexOf('/api/admin/grant-starter-bypass'),
  );
  const hookAt = reviewSection.indexOf('addApprovedEntryToWeeklyDraftBallots(');
  assert.ok(hookAt > 0, 'the approval handler must call the auto-populate helper');
  const around = reviewSection.slice(Math.max(0, hookAt - 400), hookAt + 400);
  assert.ok(around.includes('try {'), 'the auto-populate call must be inside try/catch');
  assert.ok(around.includes('catch'), 'a failure in auto-populate must be caught, never fail the approval');
});

test('server: lazy finalize endpoint exists and uses the due check; move endpoint exists', () => {
  const server = read('server.ts');
  assert.ok(server.includes('/api/voting/weekly/finalize-if-due'), 'lazy finalize endpoint must exist');
  assert.ok(server.includes('isWeeklyFinalizeDue'), 'lazy finalize must use the pure due check');
  assert.ok(server.includes('/api/admin/voting/move-candidate'), 'admin move-candidate endpoint must exist');
  assert.ok(
    server.includes("getWeeklyCategoryFromBallotId"),
    'move must parse the category out of the ballot id',
  );
});
