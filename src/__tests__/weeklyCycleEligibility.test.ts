import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWeeklyCycleConfig,
  canCastWeeklyVoteAt,
  getIsoWeekId,
  getWeeklySnapshotPath,
  getWeeklyVoteDocumentId,
  isExactlyOneActiveWeeklyCycle
} from '../logic/weeklyCycleLogic';
import {
  buildWeeklyProofSnapshot,
  getWeeklyProofEligibilityReasons,
  getWeeklyVoteRejectionReason,
  makeWeeklyBonusScoreEventId
} from '../logic/weeklyEligibility';

const cycle = buildWeeklyCycleConfig(
  new Date('2026-06-27T12:00:00.000Z'),
  'summer-2026',
  ['best_photo_proof', 'best_field_note']
);

const eligibleEntry = {
  id: 'entry-1',
  userId: 'user-2',
  status: 'approved',
  approvedAt: '2026-06-27T10:00:00.000Z',
  submittedAt: '2026-06-26T10:00:00.000Z',
  photoUrl: 'https://example.com/proof.jpg',
  challengeId: 'mission-1',
  deckId: 'summer-deck',
  seasonId: 'summer-2026',
  crewId: 'crew-2',
  fieldNote: 'Found the thing.',
  earnedXp: 25,
  visibility: {
    showInCommunityFeed: true,
    showInCrewFeed: true,
    allowWeeklyVoting: true
  }
};

test('weekly cycle creates stable ISO week ids and one active cycle invariant', () => {
  assert.equal(getIsoWeekId(new Date('2026-06-27T12:00:00.000Z')), '2026-W26');
  assert.equal(cycle.weekId, '2026-W26');
  assert.equal(cycle.phase, 'voting');
  assert.equal(isExactlyOneActiveWeeklyCycle([{ phase: 'submission' }, { phase: 'awards', isLocked: true }]), true);
  assert.equal(isExactlyOneActiveWeeklyCycle([{ phase: 'submission' }, { phase: 'voting' }]), false);
});

test('weekly proof snapshots are immutable-safe copies of eligible approved entries', () => {
  const snapshot = buildWeeklyProofSnapshot(eligibleEntry, cycle, new Date('2026-06-27T12:00:00.000Z'));

  assert.equal(snapshot.entryId, 'entry-1');
  assert.equal(snapshot.userId, 'user-2');
  assert.equal(snapshot.challengeId, 'mission-1');
  assert.equal(snapshot.deckId, 'summer-deck');
  assert.equal(snapshot.seasonId, 'summer-2026');
  assert.equal(snapshot.crewId, 'crew-2');
  assert.equal(snapshot.isEligible, true);
  assert.equal(snapshot.sourceEntryPath, 'entries/entry-1');
  assert.equal(getWeeklySnapshotPath(cycle.weekId, snapshot.entryId), 'weeklyCycles/2026-W26/proofs/entry-1');
});

test('weekly eligibility rejects pending, rejected, hidden, disqualified, old, and disabled proofs', () => {
  assert.deepEqual(getWeeklyProofEligibilityReasons(eligibleEntry, cycle), []);
  assert.ok(getWeeklyProofEligibilityReasons({ ...eligibleEntry, status: 'pending_review' }, cycle).includes('status:pending_review'));
  assert.ok(getWeeklyProofEligibilityReasons({ ...eligibleEntry, status: 'rejected' }, cycle).includes('status:rejected'));
  assert.ok(getWeeklyProofEligibilityReasons({ ...eligibleEntry, moderation: { isHidden: true } }, cycle).includes('hidden'));
  assert.ok(getWeeklyProofEligibilityReasons({ ...eligibleEntry, disqualified: true }, cycle).includes('disqualified'));
  assert.ok(getWeeklyProofEligibilityReasons({ ...eligibleEntry, visibility: { showInCommunityFeed: true, allowWeeklyVoting: false } }, cycle).includes('weekly_voting_disabled'));
  assert.ok(getWeeklyProofEligibilityReasons({ ...eligibleEntry, approvedAt: '2026-06-15T10:00:00.000Z' }, cycle).includes('approved_before_cycle'));
});

test('vote attempts are blocked outside window, for duplicates, self votes, and crew votes', () => {
  const voteId = getWeeklyVoteDocumentId(cycle.weekId, 'user-1', 'best_photo_proof');
  assert.equal(voteId, '2026-W26_user-1_best_photo_proof');
  assert.equal(canCastWeeklyVoteAt(cycle, new Date('2026-06-27T12:00:00.000Z')), true);

  assert.equal(getWeeklyVoteRejectionReason({
    voterId: 'user-1',
    entry: eligibleEntry,
    cycle: { ...cycle, phase: 'submission' },
    now: new Date('2026-06-27T12:00:00.000Z'),
    slotOrCategory: 'best_photo_proof'
  }), 'VOTING_WINDOW_CLOSED');

  assert.equal(getWeeklyVoteRejectionReason({
    voterId: 'user-2',
    entry: eligibleEntry,
    cycle,
    now: new Date('2026-06-27T12:00:00.000Z'),
    slotOrCategory: 'best_photo_proof'
  }), 'SELF_VOTE_PROHIBITED');

  assert.equal(getWeeklyVoteRejectionReason({
    voterId: 'user-1',
    voterCrewId: 'crew-2',
    entry: eligibleEntry,
    cycle,
    now: new Date('2026-06-27T12:00:00.000Z'),
    slotOrCategory: 'best_photo_proof',
    enforceCrewRestriction: true
  }), 'CREW_VOTE_PROHIBITED');

  assert.equal(getWeeklyVoteRejectionReason({
    voterId: 'user-1',
    entry: eligibleEntry,
    cycle,
    now: new Date('2026-06-27T12:00:00.000Z'),
    slotOrCategory: 'best_photo_proof',
    existingVoteIds: new Set([voteId])
  }), 'VOTE_ALREADY_CAST');
});

test('weekly bonus event ids are idempotent ledger keys', () => {
  assert.equal(
    makeWeeklyBonusScoreEventId('2026-W26', 'entry-1', 'winner', 'user-2'),
    'weeklyBonus_2026-W26_entry-1_winner_user-2'
  );
});
