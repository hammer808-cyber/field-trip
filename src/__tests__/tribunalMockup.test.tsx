// Firelight Tribunal rebuild (Nov 24, 2026): Zach's reference mockup,
// translated into the app's Field Manual system and wired to REAL data.
// The mockup's 3d23h59m42s / 03:41:58 / 02h 14m 58s figures are sample
// data — every countdown here ticks from the real weekly-cycle deadlines
// (Mon 00:00 submission open, Fri 23:59 submission close, Sat 00:00-23:59
// voting, Sun awards), and the mockup's "12 Operatives voting" / "2/3
// quorum" are NOT real (no quorum rule exists; votes are recommendations
// only), so they must not appear anywhere in the tribunal UI.
//
// Fixed dates are in America/Los_Angeles via Date.UTC offsets:
// Wed Nov 25 2026 12:00 PT (submission), Sat Nov 28 2026 12:00 PT
// (voting), Sun Nov 29 2026 12:00 PT (awards). Nov 23 2026 is the
// Monday of that week.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  formatCountdownParts,
  formatPhaseCountdown,
  getCouncilBadgeState,
  getCouncilWindow,
  getTribunalClock,
  getTribunalPhaseBreakdown,
  tribunalCaseOpenedAtMs,
} from '../logic/tribunalClock';
import { getCurrentVotingCycle } from '../services/votingCycleService';
import { TribunalClockCard } from '../components/tribunal/TribunalClockCard';
import { TribunalCouncilHeader } from '../components/tribunal/TribunalCouncilHeader';
import { TribunalEvidenceCard } from '../components/tribunal/TribunalEvidenceCard';
import { TribunalCaseDetailsDialog } from '../components/tribunal/TribunalCaseDetailsDialog';
import type { TribunalCase } from '../types/game';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const wedNoon = new Date(Date.UTC(2026, 10, 25, 20, 0, 0));
const satNoon = new Date(Date.UTC(2026, 10, 28, 20, 0, 0));
const sunNoon = new Date(Date.UTC(2026, 10, 29, 20, 0, 0));
const cycleAt = (now: Date) => getCurrentVotingCycle(now);

const fakeCase: TribunalCase = {
  id: 'case-1',
  entryId: 'entry-1',
  targetUserId: 'player-2',
  targetId: 'player-2',
  playerName: 'Field Agent',
  title: 'SNACK EVIDENCE',
  description: 'A snack receipt flagged for review.',
  proofImage: 'https://example.com/photo.jpg',
  fieldNote: 'Champs! Champs!',
  missionTitle: 'Snack Run',
  deckName: 'Starter',
  status: 'open',
  weekNumber: 48,
  seasonId: 'test-season',
  validVotes: 3,
  susVotes: 1,
  totalVotes: 4,
  createdAt: 1764100112000,
  openedAt: 1764100112000,
};

// --- Pure clock logic -------------------------------------------------------

test('tribunal clock: formatCountdownParts splits a real remaining time and clamps negatives', () => {
  // 3d 23h 59m 42s, the mockup's sample figure, as an input value.
  const parts = formatCountdownParts(3 * 86400000 + 23 * 3600000 + 59 * 60000 + 42000);
  assert.deepEqual(parts, { days: 3, hours: 23, minutes: 59, seconds: 42 });
  assert.deepEqual(formatCountdownParts(-5000), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.deepEqual(formatCountdownParts(0), { days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('tribunal clock: Wednesday counts to the Friday submission close', () => {
  const cycle = cycleAt(wedNoon);
  const clock = getTribunalClock(wedNoon, cycle);
  assert.equal(clock.phase, 'submission');
  assert.equal(clock.deadline.getTime(), cycle.submissionEnd.getTime());
  assert.equal(clock.label, 'Time left in the submission window');
  // Wed 12:00 PT to Fri 23:59:59 PT is 2d 11h 59m 59s.
  assert.deepEqual(
    formatCountdownParts(clock.deadline.getTime() - wedNoon.getTime()),
    { days: 2, hours: 11, minutes: 59, seconds: 59 },
  );
});

test('tribunal clock: Saturday counts to the Saturday voting close', () => {
  const cycle = cycleAt(satNoon);
  const clock = getTribunalClock(satNoon, cycle);
  assert.equal(clock.phase, 'voting');
  assert.equal(clock.deadline.getTime(), cycle.votingEnd.getTime());
  assert.equal(clock.label, 'Time left in the voting window');
  assert.deepEqual(
    formatCountdownParts(clock.deadline.getTime() - satNoon.getTime()),
    { days: 0, hours: 11, minutes: 59, seconds: 59 },
  );
});

test('tribunal clock: Sunday counts to the next Monday cycle reset', () => {
  const cycle = cycleAt(sunNoon);
  const clock = getTribunalClock(sunNoon, cycle);
  assert.equal(clock.phase, 'awards');
  assert.equal(clock.deadline.getTime(), cycle.weekEnd.getTime() + 1);
  assert.equal(clock.label, 'Next cycle starts in');
  assert.deepEqual(
    formatCountdownParts(clock.deadline.getTime() - sunNoon.getTime()),
    { days: 0, hours: 12, minutes: 0, seconds: 0 },
  );
});

test('tribunal clock: council window is before / active / after the Saturday vote', () => {
  const wed = getCouncilWindow(wedNoon, cycleAt(wedNoon));
  assert.equal(wed.state, 'before');
  assert.equal(wed.deadline?.getTime(), cycleAt(wedNoon).votingStart.getTime());
  assert.equal(wed.label, 'until the flame lights');

  const sat = getCouncilWindow(satNoon, cycleAt(satNoon));
  assert.equal(sat.state, 'active');
  assert.equal(sat.deadline?.getTime(), cycleAt(satNoon).votingEnd.getTime());
  assert.equal(sat.label, 'LEFT until flame extinguishes');

  const sun = getCouncilWindow(sunNoon, cycleAt(sunNoon));
  assert.equal(sun.state, 'after');
  assert.equal(sun.deadline, null);
  assert.equal(sun.label, 'Flame extinguished');
});

test('tribunal clock: phase breakdown is the real week (Signals 5d, Vote 1d, Ruling 1d)', () => {
  const wed = getTribunalPhaseBreakdown(wedNoon, cycleAt(wedNoon));
  assert.equal(wed.currentIndex, 0);
  assert.equal(wed.currentLabel, 'Signals');
  assert.deepEqual(wed.segments.map((s) => s.key), ['signals', 'vote', 'ruling']);
  assert.deepEqual(wed.segments.map((s) => s.state), ['active', 'pending', 'pending']);
  assert.equal(wed.segments.reduce((sum, s) => sum + s.widthPct, 0), 100);
  assert.equal(wed.segments[0].widthPct, 71.4);
  assert.equal(wed.segments[1].widthPct, 14.3);
  assert.equal(wed.segments[2].widthPct, 14.3);

  const sat = getTribunalPhaseBreakdown(satNoon, cycleAt(satNoon));
  assert.equal(sat.currentIndex, 1);
  assert.equal(sat.currentLabel, 'Vote');
  assert.deepEqual(sat.segments.map((s) => s.state), ['done', 'active', 'pending']);

  const sun = getTribunalPhaseBreakdown(sunNoon, cycleAt(sunNoon));
  assert.equal(sun.currentIndex, 2);
  assert.equal(sun.currentLabel, 'Ruling');
  assert.deepEqual(sun.segments.map((s) => s.state), ['done', 'done', 'active']);
});

test('tribunal clock: phase countdown formats as 02h 14m 58s', () => {
  assert.equal(formatPhaseCountdown(2 * 3600000 + 14 * 60000 + 58000), '02h 14m 58s');
  assert.equal(formatPhaseCountdown(-1000), '00h 00m 00s');
});

test('tribunal clock: council badge state follows real docket state', () => {
  assert.equal(getCouncilBadgeState(false, 3), 'locked');
  assert.equal(getCouncilBadgeState(true, 0), 'empty');
  assert.equal(getCouncilBadgeState(true, 2), 'in-session');
});

// --- Live countdown card ----------------------------------------------------

test('tribunal clock card: renders the real Wednesday deadline and ticks one second later', () => {
  const first = renderToStaticMarkup(
    React.createElement(TribunalClockCard, { now: wedNoon, cycle: cycleAt(wedNoon) }),
  );
  assert.match(first, /Clock/);
  assert.match(first, /Live/);
  assert.match(first, /Time left in the submission window/);
  assert.match(first, /02<span/); // 2 days
  assert.match(first, /11<span/); // 11 hours
  assert.match(first, /text-brand-magenta">59<\/span>/); // magenta seconds

  const oneSecondLater = renderToStaticMarkup(
    React.createElement(TribunalClockCard, {
      now: new Date(wedNoon.getTime() + 1000),
      cycle: cycleAt(wedNoon),
    }),
  );
  assert.match(oneSecondLater, /text-brand-magenta">58<\/span>/);
});

test('tribunal clock card: Sunday shows the next-cycle label', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalClockCard, { now: sunNoon, cycle: cycleAt(sunNoon) }),
  );
  assert.match(html, /Next cycle starts in/);
  assert.match(html, /12<span/); // 12 hours to Monday
});

// --- Council badge + rules popover ------------------------------------------

test('tribunal council: closed badge carries aria-expanded=false and no dialog', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalCouncilHeader, {
      now: wedNoon,
      cycle: cycleAt(wedNoon),
      weekNumber: 48,
      isUnlocked: true,
      openCaseCount: 1,
      totalVotesCast: 7,
    }),
  );
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /Council/);
  assert.match(html, /In session/);
  assert.doesNotMatch(html, /Tribal Council Rules/);
});

test('tribunal council: open popover shows real data, never invented quorum numbers', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalCouncilHeader, {
      now: wedNoon,
      cycle: cycleAt(wedNoon),
      weekNumber: 48,
      isUnlocked: true,
      openCaseCount: 1,
      totalVotesCast: 7,
      defaultOpen: true,
    }),
  );
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /role="dialog"/);
  assert.match(html, /Tribal Council Rules/);
  assert.match(html, /Active window/);
  assert.match(html, /Review window breakdown/);
  assert.match(html, /Phase 1 of 3/);
  assert.match(html, /SIGNALS PHASE:/);
  assert.match(html, /1 open case/);
  assert.match(html, /7 votes cast this week/);
  assert.match(html, /Admins make the final call/);
  assert.match(html, /Chain integrity/);
  assert.match(html, /Chamber sealed/);
  assert.match(html, /SEC\/\/TRIB-48/);
  // The mockup's invented data must never appear as fact.
  assert.doesNotMatch(html, /12 Operatives/);
  assert.doesNotMatch(html, /2\/3/);
  assert.doesNotMatch(html, /quorum/i);
  assert.doesNotMatch(html, /TRIB-84/);
});

test('tribunal council: Saturday shows phase 2 of 3 and the active vote phase', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalCouncilHeader, {
      now: satNoon,
      cycle: cycleAt(satNoon),
      weekNumber: 48,
      isUnlocked: true,
      openCaseCount: 2,
      totalVotesCast: 11,
      defaultOpen: true,
    }),
  );
  assert.match(html, /Phase 2 of 3/);
  assert.match(html, /VOTE PHASE:/);
  assert.match(html, /LEFT until flame extinguishes/);
  assert.match(html, /2 open cases/);
  assert.match(html, /11 votes cast this week/);
});

test('tribunal council: locked badge reads Docket / Locked', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalCouncilHeader, {
      now: wedNoon,
      cycle: cycleAt(wedNoon),
      weekNumber: 48,
      isUnlocked: false,
      openCaseCount: 0,
      totalVotesCast: 0,
    }),
  );
  assert.match(html, /Docket/);
  assert.match(html, /Locked/);
});

// --- Evidence card -----------------------------------------------------------

test('tribunal evidence card: shows the real case photo, title, operative, caption, and live counts', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalEvidenceCard, {
      caseData: fakeCase,
      myVote: null,
      isVoting: false,
      isOwnCase: false,
      onVote: () => {},
      onViewDetails: () => {},
    }),
  );
  assert.match(html, /OPEN_CASE_0112/);
  assert.match(html, /SNACK EVIDENCE/);
  assert.match(html, /Operative: Field Agent/);
  assert.match(html, /src="https:\/\/example\.com\/photo\.jpg"/);
  assert.match(html, /Champs! Champs!/);
  assert.match(html, /VALID \(3\)/);
  assert.match(html, /SIGNAL \(1\)/);
  assert.match(html, /4 votes so far/);
  assert.match(html, /Cast your verdict/);
  // The buttons carry Tailwind `disabled:` classes, so the check is
  // for the disabled ATTRIBUTE React renders (disabled=""), not the word.
  assert.doesNotMatch(html, /disabled=""/);
});

test('tribunal evidence card: a recorded vote disables both buttons and names the verdict', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalEvidenceCard, {
      caseData: fakeCase,
      myVote: 'valid',
      isVoting: false,
      isOwnCase: false,
      onVote: () => {},
      onViewDetails: () => {},
    }),
  );
  assert.match(html, /Your verdict is recorded: Valid/);
  assert.match(html, /aria-pressed="true"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /bg-brand-lime/);
});

test('tribunal evidence card: your own receipt cannot be voted on', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalEvidenceCard, {
      caseData: fakeCase,
      myVote: null,
      isVoting: false,
      isOwnCase: true,
      onVote: () => {},
      onViewDetails: () => {},
    }),
  );
  assert.match(html, /cannot vote on your own case/);
  assert.match(html, /disabled=""/);
});

test('tribunal evidence card: a closed case says votes are closed', () => {
  const html = renderToStaticMarkup(
    React.createElement(TribunalEvidenceCard, {
      caseData: { ...fakeCase, status: 'closed' },
      myVote: null,
      isVoting: false,
      isOwnCase: false,
      onVote: () => {},
      onViewDetails: () => {},
    }),
  );
  assert.match(html, /Case closed: votes are closed/);
});

test('tribunal clock: opened-at parses ms numbers, Timestamp seconds, Dates, and null', () => {
  assert.equal(tribunalCaseOpenedAtMs(1764100112000), 1764100112000);
  assert.equal(tribunalCaseOpenedAtMs({ seconds: 1764100112 }), 1764100112000);
  assert.equal(tribunalCaseOpenedAtMs(new Date(1764100112000)), 1764100112000);
  assert.equal(tribunalCaseOpenedAtMs(null), null);
  assert.equal(tribunalCaseOpenedAtMs(undefined), null);
});

// --- Case details dialog ------------------------------------------------------

test('tribunal case details: null renders nothing, a case renders the real record', () => {
  assert.equal(
    renderToStaticMarkup(
      React.createElement(TribunalCaseDetailsDialog, { caseData: null, onClose: () => {} }),
    ),
    '',
  );
  const html = renderToStaticMarkup(
    React.createElement(TribunalCaseDetailsDialog, { caseData: fakeCase, onClose: () => {} }),
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /Case details/);
  assert.match(html, /Snack Run/);
  assert.match(html, /Starter/);
  assert.match(html, /3 valid/);
});

// --- VotingHubPage wiring (source assertions) ----------------------------------

test('tribunal page: 1s tick, new components, real vote path, and the one-vote guard', () => {
  const page = read('src/pages/VotingHubPage.tsx');
  assert.match(page, /setInterval\(\(\) => setTribunalNow\(getServerDate\(\)\), 1000\)/);
  assert.match(page, /<TribunalClockCard now=\{tribunalNow\} cycle=\{tribunalCycle\} \/>/);
  assert.match(page, /<TribunalCouncilHeader/);
  assert.match(page, /<TribunalEvidenceCard/);
  assert.match(page, /<TribunalCaseDetailsDialog caseData=\{detailsCase\}/);
  assert.match(page, /onVote=\{\(vote\) => handleTribunalVote\(c\.id, vote\)\}/);
  assert.match(page, /await castTribunalVote\(user\.uid, caseId, vote\)/);
  assert.match(page, /if \(userTribunalVotes\[caseId\]\) return;/);
  assert.match(page, /isOwnCase=\{c\.targetUserId === user\?\.uid \|\| c\.targetId === user\?\.uid\}/);
});

test('tribunal page: locked, lobby, waiting, and archive states still exist', () => {
  const page = read('src/pages/VotingHubPage.tsx');
  assert.match(page, /Docket Locked/);
  assert.match(page, /Complete all 3 Starter Missions to access the Tribunal\./);
  assert.match(page, /No cases right now/);
  assert.match(page, /The Tribunal docket is empty\./);
  assert.match(page, /No results yet/);
  assert.match(page, /Resolved Tribunal cases will show up here\./);
  assert.match(page, /<GatedFeaturePanel featureName="Voting" reason="coming_soon" \/>/);
  assert.match(page, /Only approved receipt submissions are eligible/);
  assert.match(page, /Points are finalized after admin review/);
  assert.match(page, /variant="voting"/);
});

test('tribunal rebuild: no em dashes and no invented quorum numbers in the new files', () => {
  // The em dash is checked as its unicode escape so this test file
  // itself never contains the literal character.
  const emDash = new RegExp('\\u2014');
  for (const rel of [
    'src/logic/tribunalClock.ts',
    'src/components/tribunal/TribunalClockCard.tsx',
    'src/components/tribunal/TribunalCouncilHeader.tsx',
    'src/components/tribunal/TribunalEvidenceCard.tsx',
    'src/components/tribunal/TribunalCaseDetailsDialog.tsx',
  ]) {
    assert.doesNotMatch(read(rel), emDash, `${rel} must not contain an em dash`);
  }
  const page = read('src/pages/VotingHubPage.tsx');
  assert.doesNotMatch(page, /12 Operatives/);
  assert.doesNotMatch(page, /2\/3 quorum/);
});
