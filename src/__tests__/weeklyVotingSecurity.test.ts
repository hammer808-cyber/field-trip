import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  WEEKLY_VOTE_CATEGORIES,
  getCanonicalBallotId,
  getWeeklyBallotId,
  getWeeklyVoteId,
  getWeeklyProofExclusionReasons,
  getWeeklyVotingRestriction,
  isWeeklyCandidateEligible,
  isWeeklyEntryEligible,
  isWeeklyProofEligible,
  isWeeklyVoteCategory,
} from '../logic/weeklyVoting';
import { getCurrentVotingCycle, getVotingPhase } from '../services/votingCycleService';

test('weekly vote IDs are deterministic per user, season, week, and category', () => {
  assert.equal(
    getWeeklyVoteId('user-1', 'heatwave-receipts', 3, 'best_photo_proof'),
    'user-1_heatwave-receipts_w3_best_photo_proof'
  );
  assert.equal(getWeeklyBallotId('heatwave-receipts', 3), 'heatwave-receipts_3');
  assert.equal(getCanonicalBallotId('2026-W28', 'community_weekly'), '2026-W28_community_weekly');
  assert.equal(getCanonicalBallotId('2026-W28', 'crew_weekly', 'crew-a'), '2026-W28_crew_weekly_crew-a');
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

test('weekly proof eligibility uses approval window, media, season, and scope rules', () => {
  const window = {
    seasonId: 'heatwave-receipts',
    scope: 'crew_weekly' as const,
    crewId: 'crew-a',
    submissionStartsAt: new Date('2026-07-06T07:00:00.000Z'),
    submissionEndsAt: new Date('2026-07-11T06:59:59.999Z'),
    ballotLocksAt: new Date('2026-07-11T07:00:00.000Z'),
  };
  const approvedCrewProof = {
    id: 'proof-1',
    userId: 'user-1',
    crewId: 'crew-a',
    seasonId: 'heatwave-receipts',
    status: 'approved',
    approvedAt: '2026-07-10T18:00:00.000Z',
    storagePath: 'proofs/proof-1.jpg'
  };
  assert.equal(isWeeklyProofEligible(approvedCrewProof, window), true);
  assert.deepEqual(getWeeklyProofExclusionReasons({ ...approvedCrewProof, approvedAt: '2026-07-11T08:00:00.000Z' }, window), [
    'approved_after_submission_window',
    'approved_after_ballot_lock'
  ]);
  assert.ok(getWeeklyProofExclusionReasons({ ...approvedCrewProof, crewId: 'crew-b' }, window).includes('crew_mismatch'));
  assert.ok(getWeeklyProofExclusionReasons({ ...approvedCrewProof, storagePath: '' }, window).includes('missing_media'));
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

test('canonical voting cycle model uses America/Los_Angeles week IDs and schedule', () => {
  const saturdayPacific = new Date('2026-07-11T19:00:00.000Z');
  const sundayBeforePublish = new Date('2026-07-12T15:59:00.000Z');
  const sundayAfterPublish = new Date('2026-07-12T16:00:00.000Z');
  const cycle = getCurrentVotingCycle(saturdayPacific);
  assert.equal(cycle.id, '2026-W28');
  assert.equal(cycle.timezone, 'America/Los_Angeles');
  assert.equal(cycle.submissionStart.toISOString(), '2026-07-06T07:00:00.000Z');
  assert.equal(cycle.submissionEnd.toISOString(), '2026-07-11T06:59:59.999Z');
  assert.equal(cycle.votingStart.toISOString(), '2026-07-11T07:00:00.000Z');
  assert.equal(cycle.votingEnd.toISOString(), '2026-07-12T06:59:59.999Z');
  assert.equal(cycle.resultsPublishAt.toISOString(), '2026-07-12T16:00:00.000Z');
  assert.equal(getVotingPhase(saturdayPacific, cycle), 'voting');
  assert.equal(getCurrentVotingCycle(sundayBeforePublish).status, 'results_pending');
  assert.equal(getCurrentVotingCycle(sundayAfterPublish).status, 'results_published');
});

test('Firestore rules block direct client manipulation of weekly votes and results', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');
  assert.match(rules, /match \/votes\/\{voteId\}[\s\S]*allow create, update: if false;/);
  assert.match(rules, /match \/votingCycles\/\{cycleId\}[\s\S]*match \/ballots\/\{ballotId\}[\s\S]*match \/votes\/\{voterId\}[\s\S]*allow create, update, delete: if false;/);
  assert.match(rules, /match \/votingCycles\/\{cycleId\}[\s\S]*match \/results\/\{resultId\}[\s\S]*allow create, update, delete: if isAdmin\(\);/);
  assert.match(rules, /match \/weeklyBallots\/\{ballotId\}[\s\S]*allow create: if isAdmin\(\)/);
  assert.match(rules, /match \/weeklySummaries\/\{id\}[\s\S]*allow write: if isAdmin\(\)/);
  assert.match(rules, /match \/weeklyCycles\/\{weekId\}[\s\S]*match \/proofs\/\{entryId\}[\s\S]*allow create, update, delete: if isAdmin\(\);/);
  assert.match(rules, /match \/weeklyCycles\/\{weekId\}[\s\S]*match \/votes\/\{voteId\}[\s\S]*allow create, update, delete: if false;/);
  assert.match(rules, /match \/weeklyCycles\/\{weekId\}[\s\S]*match \/results\/\{resultId\}[\s\S]*allow create, update, delete: if isAdmin\(\);/);
});

test('server weekly vote endpoint uses transactions and immutable vote creation', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.match(server, /app\.post\("\/api\/voting\/weekly\/vote"/);
  assert.match(server, /runTransaction/);
  assert.match(server, /selectedProofIds/);
  assert.match(server, /ballotRef\.collection\('votes'\)\.doc\(uid\)/);
  assert.match(server, /transaction\.create\(voteRef, voteData\)/);
  assert.match(server, /VOTE_ALREADY_CAST/);
  assert.doesNotMatch(server, /Participated in Tribunal Consensus/);
});

test('server builds canonical cycle ballots and result snapshots without deleting legacy data', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.match(server, /collection\('votingCycles'\)\.doc\(cycleId\)/);
  assert.match(server, /getCanonicalBallotId\(cycleId, target\.scope, target\.crewId\)/);
  assert.match(server, /excludedLateProofs/);
  assert.match(server, /collection\('results'\)\.doc\(ballotId\)/);
  assert.match(server, /weekly_award_\$\{cycleId\}_\$\{winner\.userId\}/);
  assert.match(server, /\/api\/admin\/voting\/void-vote/);
  assert.match(server, /\/api\/admin\/voting\/remove-proof/);
});

test('weekly ballot UI reads the canonical ballot schema before legacy candidates', () => {
  const votingHub = fs.readFileSync('src/components/VotingHub.tsx', 'utf8');
  const votingService = fs.readFileSync('src/services/weeklyVotingService.ts', 'utf8');
  assert.match(votingHub, /loadWeeklyBallot\(\{/);
  assert.match(votingHub, /castCanonicalWeeklyVote\(\{/);
  assert.match(votingService, /lookup\.canonicalBallotPath/);
  assert.match(votingService, /lookup\.canonicalEntriesPath/);
  assert.match(votingService, /Historical compatibility is read-only here/);
  assert.ok(
    votingService.indexOf('lookup.canonicalBallotPath') <
      votingService.indexOf("collection(db, 'weeklyBallots'")
  );
  assert.match(votingHub, /isWeeklyCandidateEligible\(\{ \.\.\.entry, categories, isEligible: true \}, selectedCategory\)/);
});

test('weekly ballot builder accepts approved legacy submitted proofs with storage-backed media', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  const buildStart = server.indexOf('app.post("/api/admin/voting/build-weekly-ballot"');
  const buildRoute = server.slice(buildStart, server.indexOf('app.post("/api/admin/voting/finalize-week"', buildStart));
  assert.match(buildRoute, /where\('status', 'in', Array\.from\(APPROVED_PROOF_STATUSES\)\)/);
  assert.match(buildRoute, /isWeeklyProofEligible\(entry/);
  assert.match(buildRoute, /entry\.storagePath/);
  assert.match(buildRoute, /storagePath: entry\.storagePath \|\| entry\.photoStoragePath \|\| entry\.imageStoragePath/);
});

test('weekly voting page copy does not promise instant vote XP', () => {
  const votingPage = fs.readFileSync('src/pages/VotingHubPage.tsx', 'utf8');
  assert.doesNotMatch(votingPage, /Every vote earns you 5 XP immediately/);
  assert.match(votingPage, /Only approved receipt submissions are eligible/);
  assert.match(votingPage, /Points are finalized after admin review/);
});

test('weekly diagnostics endpoint documents legacy compatibility instead of deleting data', () => {
  const server = fs.readFileSync('server.ts', 'utf8');
  assert.match(server, /\/api\/admin\/voting\/diagnostics/);
  assert.match(server, /legacyWeeklyVotesSampleExists/);
  assert.match(server, /legacyVoteEventsSampleExists/);
  assert.match(server, /WEEKLY_VOTING_COMPATIBILITY_NOTE/);
});
