import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildVotingOpenNotificationDoc,
  buildWeeklyWinnerNotificationDoc,
  getVotingOpenNotificationId,
  getWeeklyAwardLabel,
  getWeeklyWinnerNotificationId,
  isVotingOpenAnnounceDue,
} from '../logic/weeklyNotifications';
import { votingOpenCopy, weeklyWinnerCopy } from '../logic/playerNotifications';
import { WEEKLY_VOTE_CATEGORIES } from '../logic/weeklyVoting';
import { getWeeklyCategoryBallotId } from '../logic/weeklyCategories';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

/** Saturday Nov 21, 2026 12:00 PT — inside the voting window. */
const SAT_NOON_PT = new Date('2026-11-21T12:00:00-08:00').getTime();
/** Saturday Nov 21, 2026 00:00 PT — the window opens. */
const SAT_OPEN_PT = new Date('2026-11-21T00:00:00-08:00').getTime();
/** Saturday Nov 21, 2026 23:59:59.999 PT — the window closes. */
const SAT_CLOSE_PT = new Date('2026-11-21T23:59:59.999-08:00').getTime();
/** Friday Nov 20, 2026 12:00 PT — before the window. */
const FRI_NOON_PT = new Date('2026-11-20T12:00:00-08:00').getTime();
/** Sunday Nov 22, 2026 10:00 PT — after the window. */
const SUN_10AM_PT = new Date('2026-11-22T10:00:00-08:00').getTime();

// ---------------------------------------------------------------------------
// Pure helpers: src/logic/weeklyNotifications.ts
// ---------------------------------------------------------------------------

test('winner notification ids are deterministic and distinct per award won', () => {
  const cycleId = '2026-W47';
  const photoBallot = getWeeklyCategoryBallotId(cycleId, 'best_photo_proof');
  const noteBallot = getWeeklyCategoryBallotId(cycleId, 'best_field_note');
  // One doc per award won: a player winning two category ballots gets
  // two rows, not one deduped row (the same trap the pre-Slice-1 XP
  // event id had).
  const photoWin = getWeeklyWinnerNotificationId(cycleId, photoBallot);
  const noteWin = getWeeklyWinnerNotificationId(cycleId, noteBallot);
  assert.notEqual(photoWin, noteWin);
  assert.equal(photoWin, getWeeklyWinnerNotificationId(cycleId, photoBallot));
  assert.match(photoWin, /^weekly_winner_2026-W47_/);
});

test('voting-open notification id is one row per player per cycle', () => {
  assert.equal(getVotingOpenNotificationId('2026-W47'), 'voting_open_2026-W47');
  assert.notEqual(getVotingOpenNotificationId('2026-W47'), getVotingOpenNotificationId('2026-W48'));
});

test('award labels name the six accolades, with a generic fallback', () => {
  assert.equal(getWeeklyAwardLabel('best_photo_proof'), 'Best Photo Proof');
  assert.equal(getWeeklyAwardLabel('goblin_energy_award'), 'Goblin Energy Award');
  assert.equal(getWeeklyAwardLabel('underdog_award'), 'Underdog Award');
  for (const category of WEEKLY_VOTE_CATEGORIES) {
    assert.notEqual(getWeeklyAwardLabel(category), 'Weekly award');
  }
  // Crew/tribunal ballots carry no accolade category — the row still
  // reads, it just names the generic award.
  assert.equal(getWeeklyAwardLabel(null), 'Weekly award');
  assert.equal(getWeeklyAwardLabel('not_a_category'), 'Weekly award');
});

test('winner doc builder denormalizes the award label, mission, and XP', () => {
  assert.deepEqual(
    buildWeeklyWinnerNotificationDoc({
      cycleId: '2026-W47',
      ballotId: getWeeklyCategoryBallotId('2026-W47', 'best_photo_proof'),
      category: 'best_photo_proof',
      entryId: 'entry-1',
      missionTitle: 'Find the Coolest Shadow',
      xpAwarded: 100,
    }),
    {
      type: 'weekly_winner',
      cycleId: '2026-W47',
      ballotId: '2026-W47_community_weekly_best_photo_proof',
      category: 'best_photo_proof',
      awardLabel: 'Best Photo Proof',
      entryId: 'entry-1',
      missionTitle: 'Find the Coolest Shadow',
      xpAwarded: 100,
      read: false,
    },
  );
});

test('voting-open doc builder carries the cycle and season, unread', () => {
  assert.deepEqual(buildVotingOpenNotificationDoc({ cycleId: '2026-W47', seasonId: 'heatwave-receipts' }), {
    type: 'voting_open',
    cycleId: '2026-W47',
    seasonId: 'heatwave-receipts',
    read: false,
  });
});

test('voting-open fan-out is due only inside the window, once per cycle', () => {
  const window = { votingStartsAtMs: SAT_OPEN_PT, votingEndsAtMs: SAT_CLOSE_PT, alreadyAnnounced: false };
  assert.deepEqual(isVotingOpenAnnounceDue({ ...window, nowMs: SAT_NOON_PT }), { due: true, reason: 'due' });
  assert.deepEqual(isVotingOpenAnnounceDue({ ...window, nowMs: SAT_OPEN_PT }), { due: true, reason: 'due' });
  assert.deepEqual(isVotingOpenAnnounceDue({ ...window, nowMs: SAT_CLOSE_PT }), { due: true, reason: 'due' });
  // Before the window (Friday) and after it (Sunday) the call is a
  // no-op, not a fan-out.
  assert.deepEqual(isVotingOpenAnnounceDue({ ...window, nowMs: FRI_NOON_PT }), { due: false, reason: 'before_voting_window' });
  assert.deepEqual(isVotingOpenAnnounceDue({ ...window, nowMs: SUN_10AM_PT }), { due: false, reason: 'after_voting_window' });
  // The marker: a second trigger in the same cycle announces nothing,
  // so the notification must not repeat every page load.
  assert.deepEqual(
    isVotingOpenAnnounceDue({ ...window, nowMs: SAT_NOON_PT, alreadyAnnounced: true }),
    { due: false, reason: 'already_announced' },
  );
});

// ---------------------------------------------------------------------------
// Copy: src/logic/playerNotifications.ts
// ---------------------------------------------------------------------------

test('voting-open copy names the open ballot and the Saturday close', () => {
  assert.deepEqual(votingOpenCopy(), {
    title: 'Weekly voting is open',
    detail: 'Ballots are open — cast your votes before the ballot closes Saturday night.',
  });
});

test('winner copy names the award, the mission, and the XP', () => {
  assert.deepEqual(
    weeklyWinnerCopy({ awardLabel: 'Best Photo Proof', missionTitle: 'Find the Coolest Shadow', xpAwarded: 100 }),
    { title: 'You won Best Photo Proof', detail: 'Find the Coolest Shadow · +100 XP' },
  );
  // A re-finalize winner with no mission title on file still reads.
  assert.deepEqual(
    weeklyWinnerCopy({ awardLabel: 'Weekly award', missionTitle: '', xpAwarded: 100 }),
    { title: 'You won Weekly award', detail: '+100 XP' },
  );
  assert.deepEqual(
    weeklyWinnerCopy({ awardLabel: '', missionTitle: 'Find the Coolest Shadow', xpAwarded: 100 }),
    { title: 'You won Weekly award', detail: 'Find the Coolest Shadow · +100 XP' },
  );
});

// ---------------------------------------------------------------------------
// Server wiring (source-level; runCanonicalWeeklyFinalize and the
// endpoints live inside the server factory, so the emulator-free tests
// pin the wiring in server.ts — same approach as Slice 1).
// ---------------------------------------------------------------------------

test('server: canonical finalize writes one winner notification per award won, best-effort', () => {
  const server = read('server.ts');
  // The finalize collects winners from BOTH branches (fresh + the
  // already-finalized repair path) and writes them after the
  // XP/sticker awards.
  assert.match(server, /winnerNotifications\.push\(\{/);
  assert.match(server, /getWeeklyWinnerNotificationId\(cycleId, winnerNotification\.ballotId\)/);
  assert.match(server, /buildWeeklyWinnerNotificationDoc\(\{/);
  // Best-effort: a notification failure is warned and skipped, never
  // thrown — finalize and the awards above it survive.
  assert.match(server, /Winner notification skipped/);
  // An existing doc (re-finalize) is left untouched, so a read flag is
  // never reset.
  assert.match(server, /if \(existingNotif\.exists\)/);
  // The outcome carries the per-award results to both callers (the
  // admin finalize endpoint and finalize-if-due spread the outcome).
  assert.match(server, /winnerNotifications: winnerNotificationResults/);
});

test('server: lazy voting-open fan-out endpoint exists with a once-per-cycle marker', () => {
  const server = read('server.ts');
  assert.match(server, /\/api\/voting\/weekly\/notify-open-if-due/);
  assert.match(server, /isVotingOpenAnnounceDue\(\{/);
  // Marker field on the cycle doc is the fast-path skip.
  assert.match(server, /votingOpenAnnouncedAt/);
  // Per-user create() under the deterministic id is the atomic dedupe
  // — a concurrent trigger or a retry can never duplicate a row or
  // reset a read flag.
  assert.match(server, /getVotingOpenNotificationId\(cycleId\)/);
  assert.match(server, /\.create\(\{/);
  // Announcing requires a built community ballot, like finalize-if-due.
  assert.match(server, /no_community_ballots/);
  // A partial fan-out writes no marker, so the next page load retries.
  assert.match(server, /partial_fanout/);
});

test('client: the voting page triggers the fan-out once per load, gated on VOTING_ENABLED', () => {
  const page = read('src/pages/VotingHubPage.tsx');
  assert.match(page, /\/api\/voting\/weekly\/notify-open-if-due/);
  assert.match(page, /clockInfo\.phase !== 'voting'/);
  assert.match(page, /!VOTING_ENABLED/);
  assert.match(page, /notifyOpenFiredForSeasonRef/);
});

test('client: the notification subscription maps both voting types, not the decision fallback', () => {
  const service = read('src/services/playerNotificationService.ts');
  assert.match(service, /data\.type === 'voting_open'/);
  assert.match(service, /data\.type === 'weekly_winner'/);
});

// ---------------------------------------------------------------------------
// Gating cleanups (source-level where the flag is a const false and the
// live path cannot be rendered in-test).
// ---------------------------------------------------------------------------

test('Basecamp: the Voting quick link is gated on VOTING_ENABLED', () => {
  const viewModel = read('src/logic/basecampViewModel.ts');
  assert.match(viewModel, /link\.id !== 'voting' \|\| VOTING_ENABLED/);
});

test('Crew: the voting tab is gated on VOTING_ENABLED and points at the global ballot', () => {
  const crew = read('src/pages/Crew.tsx');
  assert.match(crew, /\.\.\.\(VOTING_ENABLED \? \[/);
  assert.match(crew, /navigate\('\/voting'\)/);
  assert.doesNotMatch(crew, /scope=crew_weekly/);
  assert.doesNotMatch(crew, /crew_weekly/);
});

test('VotingBallotPage: the fallback panel says coming soon, not starter', () => {
  const page = read('src/pages/VotingBallotPage.tsx');
  assert.match(page, /reason="coming_soon"/);
  assert.doesNotMatch(page, /reason="starter"/);
});

test('Trevor: open_voting honors VOTING_ENABLED', () => {
  const actions = read('src/config/trevorActions.ts');
  assert.match(actions, /VOTING_ENABLED && context\.starterComplete && context\.votingPhase === 'voting'/);
});

test('Big Board: the demo ballot and the Ballot Live card are gone; Awards routes to the real page', () => {
  const bigBoard = read('src/pages/BigBoard.tsx');
  assert.doesNotMatch(bigBoard, /WeeklyAwardsSection/);
  assert.doesNotMatch(bigBoard, /Agent Bigfoot/);
  assert.doesNotMatch(bigBoard, /DEMO MODE/);
  assert.doesNotMatch(bigBoard, /Ballot Live/);
  assert.doesNotMatch(bigBoard, /Weekly Pulse/);
  assert.match(bigBoard, /navigate\('\/voting\/awards'\)/);
});
