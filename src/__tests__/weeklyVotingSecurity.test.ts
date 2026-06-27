import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  WEEKLY_VOTE_CATEGORIES,
  getWeeklyBallotId,
  getWeeklyVoteId,
  getWeeklyVotingRestriction,
  isWeeklyCandidateEligible,
  isWeeklyEntryEligible,
  isWeeklyVoteCategory,
} from '../logic/weeklyVoting';
import { getCurrentVotingCycle, getVotingPhase } from '../services/votingCycleService';

test('weekly vote IDs are deterministic per user, season, week, and category', () => {
  assert.equal(
    getWeeklyVoteId('user-1', 'heatwave-receipts', 3, 'best_photo_proof'),
    'user-1_heatwave-receipts_w3_best_photo_proof'
  );
  assert.equal(getWeeklyBallotId('heatwave-receipts', 3), 'heatwave-receipts_3');
});

test('weekly vote categories stay on the canonical accolade set', () => {
  assert.deepEqual([...WEEKLY_VOTE_CATEGORIES].sort(), [
    'best_field_note',
    'best_photo_proof',
    'cleanest_completion',
    'goblin_energy_award',
    'most_legendary_errand',
    'underdog_award'
  ].sort());
  assert.equal(isWeeklyVoteCategory('best_field_note'), true);
  assert.equal(isWeeklyVoteCategory('surprise_category'), false);
});

test('weekly vote cast payload does not include instant XP fields', () => {
  const payload = {
    userId: 'user-1',
    entryId: 'entry-2',
    weekNumber: 4,
    seasonId: 'heatwave-receipts',
    category: 'best_field_note',
    createdAt: 'serverTimestamp'
  };

  assert.equal('points' in payload, false);
  assert.equal('xp' in payload, false);
  assert.equal('scoreEventId' in payload, false);
});

test('weekly entry and candidate eligibility reject non-approved or disqualified proofs', () => {
  assert.equal(isWeeklyEntryEligible({ status: 'approved', userId: 'u2' }), true);
  assert.equal(isWeeklyEntryEligible({ status: 'pending_review', userId: 'u2' }), false);
  assert.equal(isWeeklyEntryEligible({ status: 'rejected', userId: 'u2' }), false);
  assert.equal(isWeeklyEntryEligible({ status: 'approved', archived: true, userId: 'u2' }), false);
  assert.equal(isWeeklyEntryEligible({ status: 'approved', disqualified: true, userId: 'u2' }), false);

  assert.equal(isWeeklyCandidateEligible({ categories: ['best_field_note'], isEligible: true }, 'best_field_note'), true);
  assert.equal(isWeeklyCandidateEligible({ categories: ['best_field_note'], isDisqualified: true }, 'best_field_note'), false);
  assert.equal(isWeeklyCandidateEligible({ categories: ['best_photo_proof'] }, 'best_field_note'), false);
});

test('weekly voting restrictions block self votes and optional crew votes', () => {
  assert.equal(getWeeklyVotingRestriction({ voterId: 'u1', entry: { userId: 'u1' } }), 'SELF_VOTE_PROHIBITED');
  assert.equal(
    getWeeklyVotingRestriction({ voterId: 'u1', voterCrewId: 'crew-a', entry: { userId: 'u2', crewId: 'crew-a' }, enforceCrewRestriction: true }),
    'CREW_VOTE_PROHIBITED'
  );
  assert.equal(
    getWeeklyVotingRestriction({ voterId: 'u1', voterCrewId: 'crew-a', entry: { userId: 'u2', crewId: 'crew-a' }, enforceCrewRestriction: false }),
    null
  );
});

test('canonical voting cycle model maps Saturday to voting and Sunday to awards in UTC', () => {
  const saturday = new Date('2026-06-27T12:00:00.000Z');
  const sunday = new Date('2026-06-28T12:00:00.000Z');
  assert.equal(getVotingPhase(saturday, getCurrentVotingCycle(saturday, 'UTC')), 'voting');
  assert.equal(getVotingPhase(sunday, getCurrentVotingCycle(sunday, 'UTC')), 'awards');
});

test('Firestore rules block direct client manipulation of weekly votes and results', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /match \/votes\/\{voteId\}[\s\S]*allow create, update: if false;/);
  assert.match(rules, /match \/weeklyBallots\/\{ballotId\}[\s\S]*allow create: if isAdmin\(\)/);
  assert.match(rules, /match \/weeklySummaries\/\{id\}[\s\S]*allow write: if isAdmin\(\)/);
});

test('server weekly vote endpoint uses transactions and immutable vote creation', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.match(server, /app\.post\("\/api\/voting\/weekly\/vote"/);
  assert.match(server, /runTransaction/);
  assert.match(server, /transaction\.create\(voteRef, voteData\)/);
  assert.match(server, /VOTE_ALREADY_CAST/);
  assert.doesNotMatch(server, /Participated in Tribunal Consensus/);
});

test('weekly diagnostics endpoint documents legacy compatibility instead of deleting data', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.match(server, /\/api\/admin\/voting\/diagnostics/);
  assert.match(server, /legacyWeeklyVotesSampleExists/);
  assert.match(server, /legacyVoteEventsSampleExists/);
  assert.match(server, /WEEKLY_VOTING_COMPATIBILITY_NOTE/);
});
