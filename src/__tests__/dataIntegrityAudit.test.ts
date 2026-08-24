import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildScoreProjectionChanges,
  buildScoreRepairMutationTrace,
  projectScoreLedger,
} from '../logic/scoringLedger';
import { buildLedgerBackedProgressionRepairPlan } from '../server/playerProgression';
import { getSocialFeedExclusionReasons } from '../logic/communityFeed';

const serverSource = readFileSync('server.ts', 'utf8');

const event = (id: string, userId: string, amount: number, extras: Record<string, unknown> = {}) => ({ id, userId, amount, ...extras });

test('known diagnostic fixtures rebuild exactly from the canonical score-event ledger', () => {
  const events = [
    event('daphzee-proof-1', 'daphzee-uid', 100), event('daphzee-proof-2', 'daphzee-uid', 200),
    event('mexmax-proof-1', 'mexmax-uid', 200),
    event('stale-hammertime', 'hammertime-uid', 900, { archived: true }),
  ];
  assert.equal(projectScoreLedger('daphzee-uid', events).lifetimeXp, 300);
  assert.equal(projectScoreLedger('mexmax-uid', events).lifetimeXp, 200);
  assert.equal(projectScoreLedger('hammertime-uid', events).lifetimeXp, 0);
});

test('derived totals cannot create ledger events and a second projection repair is idempotent', () => {
  const events = [event('proof-1', 'user-1', 300)];
  const first = buildScoreRepairMutationTrace('user-1', { xp: 999, points: 999 }, events);
  assert.deepEqual(first.mutations.map(mutation => mutation.after), [300, 300]);
  const repairedProfile = { xp: 300, points: 300 };
  const second = buildScoreRepairMutationTrace('user-1', repairedProfile, events);
  assert.equal(second.mutations.length, 0);
  assert.equal(events.length, 1);
});

test('a missing user profile is never recreated from score or cached projection data', () => {
  const audit = buildScoreRepairMutationTrace('deleted-user', null, [event('old', 'deleted-user', 500)]);
  assert.equal(audit.deletionState, 'profile_missing');
  assert.deepEqual(audit.mutations, []);
  assert.deepEqual(buildScoreProjectionChanges({ xp: 5000 }, projectScoreLedger('deleted-user', [])), { xp: 0 });
});

test('progression repair reads ledger totals instead of cached profile totals', () => {
  const plan = buildLedgerBackedProgressionRepairPlan('user-1', { xp: 900, points: 900, level: 1, levelTitle: 'Wrong' }, [event('proof', 'user-1', 200)]);
  assert.equal(plan.xp, 200);
  assert.equal(plan.changes.xp, 200);
  assert.equal(plan.changes.points, 200);
  assert.ok(plan.reasons.includes('profile_totals_drifted_from_score_event_ledger'));
});

test('proof existence and migration state remain separate from Community visibility', () => {
  const historical = { id: 'proof-1', status: 'approved', userId: 'owner', photoUrl: 'https://example.test/proof.jpg', approvedAt: '2026-01-01' };
  const reasons = getSocialFeedExclusionReasons(historical, { viewerUserId: 'viewer', activeCrewId: 'crew-now', activeSeasonId: 'season-now' });
  assert.ok(reasons.includes('missing_season'));
  assert.ok(reasons.includes('missing_crew_scope'));
  assert.equal(historical.id, 'proof-1');
  assert.equal('crewId' in historical, false);
});

test('production Repair dry-run is write-free and traces canonical mutation sources', () => {
  const repairStart = serverSource.indexOf('async function repairUserState');
  const repairEnd = serverSource.indexOf('async function bulkRepairSystemState', repairStart);
  const repair = serverSource.slice(repairStart, repairEnd);
  const dryRunBranch = repair.slice(repair.indexOf('if (!dryRun)'));
  assert.match(repair, /mutationTrace/);
  assert.match(repair, /canonicalSource/);
  assert.match(repair, /dryRunWriteCount: 0/);
  assert.doesNotMatch(dryRunBranch, /else\s*\{[\s\S]*adminRepairLogs[\s\S]*individual_user_repair_dry_run/);
  assert.doesNotMatch(repair, /storageAdmin|\.delete\(\)|batch\.delete/);
  assert.doesNotMatch(repair, /collection\(['"]scoreEvents['"]\)\.doc[\s\S]{0,200}(set|create|update)/);
  assert.doesNotMatch(repair, /entries:\s*\[\.\.\.reviewsAsEntries/);
  assert.match(repair, /entries:\s*normalizedEntriesForAfter/);
});
