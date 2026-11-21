import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WEEKLY_VOTE_CATEGORIES, type WeeklyVoteCategory } from '../logic/weeklyVoting';
import {
  clearCategoryPick,
  countCanonicalWinners,
  countCategoryPicks,
  getCategoryPick,
  hasCanonicalWinners,
  hasCategoryPickChanged,
  replaceCategoryPick,
  resolveCanonicalWinnerDisplay,
  type CanonicalWeeklyResultLike,
} from '../logic/weeklyCategoryBallots';
import { getWeeklyCategoryBallotId } from '../logic/weeklyCategories';
import { WeeklyCategoryBallotSection } from '../components/WeeklyCategoryBallotSection';
import { WeeklyAwardsResults } from '../components/WeeklyAwardsResults';
import {
  WeeklyCandidateMovePanel,
  buildWeeklyCandidateMoveRows,
} from '../components/WeeklyCandidateMovePanel';
import type { WeeklyCategoryBallotReadModel } from '../services/weeklyVotingService';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

const noop = () => undefined;

// --- Pure pick helpers: one vote per award, replace on change ----------

test('replaceCategoryPick: picking a different photo in the same award replaces the pick', () => {
  const picks = replaceCategoryPick({}, 'best_photo_proof', 'entry-a');
  assert.equal(getCategoryPick(picks, 'best_photo_proof'), 'entry-a');
  const replaced = replaceCategoryPick(picks, 'best_photo_proof', 'entry-b');
  assert.equal(getCategoryPick(replaced, 'best_photo_proof'), 'entry-b');
  assert.equal(countCategoryPicks(replaced), 1);
});

test('replaceCategoryPick: picking the same photo again is a no-op; other awards are untouched', () => {
  const picks = { best_photo_proof: 'entry-a', underdog_award: 'entry-c' };
  const same = replaceCategoryPick(picks, 'best_photo_proof', 'entry-a');
  assert.deepEqual(same, picks);
  const changed = replaceCategoryPick(picks, 'underdog_award', 'entry-d');
  assert.equal(getCategoryPick(changed, 'underdog_award'), 'entry-d');
  assert.equal(getCategoryPick(changed, 'best_photo_proof'), 'entry-a');
  assert.equal(countCategoryPicks(changed), 2);
});

test('clearCategoryPick removes only that award; hasCategoryPickChanged tracks draft vs filed', () => {
  const picks = { best_photo_proof: 'entry-a', underdog_award: 'entry-c' } as const;
  const cleared = clearCategoryPick(picks, 'best_photo_proof');
  assert.equal(getCategoryPick(cleared, 'best_photo_proof'), null);
  assert.equal(getCategoryPick(cleared, 'underdog_award'), 'entry-c');
  assert.equal(hasCategoryPickChanged({ best_photo_proof: 'entry-a' }, { best_photo_proof: 'entry-a' }, 'best_photo_proof'), false);
  assert.equal(hasCategoryPickChanged({ best_photo_proof: 'entry-b' }, { best_photo_proof: 'entry-a' }, 'best_photo_proof'), true);
  assert.equal(hasCategoryPickChanged({}, { best_photo_proof: 'entry-a' }, 'best_photo_proof'), true);
});

// --- Pure canonical results helpers -------------------------------------

test('resolveCanonicalWinnerDisplay joins the candidate snapshot; blanks stay blank, never invented', () => {
  const result: CanonicalWeeklyResultLike = {
    ballotId: getWeeklyCategoryBallotId('2026-W47', 'best_photo_proof'),
    category: 'best_photo_proof',
    isFinal: true,
    winner: { entryId: 'entry-1', userId: 'user-1', displayName: 'Agent Ada', voteTotal: 7 },
    validVoteCount: 9,
  };
  const display = resolveCanonicalWinnerDisplay(result, {
    entryId: 'entry-1',
    tripTitle: 'Find the Coolest Shadow',
    fieldNote: 'The shade had opinions.',
    proofImage: 'https://example.com/photo.jpg',
  });
  assert.deepEqual(display, {
    entryId: 'entry-1',
    userId: 'user-1',
    userName: 'Agent Ada',
    tripTitle: 'Find the Coolest Shadow',
    fieldNote: 'The shade had opinions.',
    proofImage: 'https://example.com/photo.jpg',
    voteTotal: 7,
  });
  // No candidate snapshot: name and votes survive, photo/note are honest blanks.
  const bare = resolveCanonicalWinnerDisplay(result, null);
  assert.equal(bare?.userName, 'Agent Ada');
  assert.equal(bare?.voteTotal, 7);
  assert.equal(bare?.proofImage, '');
  assert.equal(bare?.fieldNote, '');
  // No winner at all: null, never a fake winner.
  assert.equal(resolveCanonicalWinnerDisplay({ ballotId: 'x', winner: null }, null), null);
  assert.equal(resolveCanonicalWinnerDisplay(null, null), null);
});

test('countCanonicalWinners counts only awards with a published winner', () => {
  const results = {
    best_photo_proof: { winner: { entryId: 'entry-1', voteTotal: 3 } },
    best_field_note: { winner: null },
    most_legendary_errand: null,
    goblin_energy_award: { winner: { proofId: 'entry-2', voteTotal: 1 } },
    cleanest_completion: null,
    underdog_award: null,
  } as unknown as Record<WeeklyVoteCategory, CanonicalWeeklyResultLike | null>;
  assert.equal(countCanonicalWinners(results), 2);
  assert.equal(hasCanonicalWinners(results), true);
  assert.equal(hasCanonicalWinners({
    best_photo_proof: null, best_field_note: null, most_legendary_errand: null,
    goblin_energy_award: null, cleanest_completion: null, underdog_award: null,
  }), false);
});

// --- One award section renders its candidates, pick, and filed state ---

function makeEntry(id: string, userName: string) {
  return {
    id,
    entryId: id,
    userId: `user-${id}`,
    userName,
    displayName: userName,
    tripTitle: `Mission for ${id}`,
    proofImage: `https://example.com/${id}.jpg`,
    imageUrl: `https://example.com/${id}.jpg`,
    fieldNote: `Note for ${id}.`,
    categories: ['best_photo_proof'],
  } as any;
}

test('WeeklyCategoryBallotSection renders one award with its candidates, author, mission, and note', () => {
  const html = renderToStaticMarkup(
    <WeeklyCategoryBallotSection
      category="best_photo_proof"
      candidates={[makeEntry('entry-a', 'Agent Ada'), makeEntry('entry-b', 'Agent Bo')]}
      selectedEntryId={null}
      filedEntryId={null}
      isVotingOpen
      isFiling={false}
      hasChanges={false}
      onSelect={noop}
      onFile={noop}
    />,
  );
  assert.match(html, /Main Character Moment/);
  assert.match(html, /data-category="best_photo_proof"/);
  assert.match(html, /Agent Ada/);
  assert.match(html, /Agent Bo/);
  assert.match(html, /Mission for entry-a/);
  assert.match(html, /Note for entry-a/);
  assert.match(html, /https:\/\/example\.com\/entry-a\.jpg/);
  assert.match(html, /One vote per voter/);
});

test('WeeklyCategoryBallotSection shows the current pick as stamped and a filed pick as filed', () => {
  const draftHtml = renderToStaticMarkup(
    <WeeklyCategoryBallotSection
      category="underdog_award"
      candidates={[makeEntry('entry-a', 'Agent Ada'), makeEntry('entry-b', 'Agent Bo')]}
      selectedEntryId="entry-b"
      filedEntryId={null}
      isVotingOpen
      isFiling={false}
      hasChanges
      onSelect={noop}
      onFile={noop}
    />,
  );
  assert.match(draftHtml, /Stamped Pick/);
  assert.match(draftHtml, /Pick changed — file it to count/);
  assert.doesNotMatch(draftHtml, /Vote Filed/);

  const filedHtml = renderToStaticMarkup(
    <WeeklyCategoryBallotSection
      category="underdog_award"
      candidates={[makeEntry('entry-a', 'Agent Ada'), makeEntry('entry-b', 'Agent Bo')]}
      selectedEntryId="entry-b"
      filedEntryId="entry-b"
      isVotingOpen
      isFiling={false}
      hasChanges={false}
      onSelect={noop}
      onFile={noop}
    />,
  );
  assert.match(filedHtml, /Vote Filed/);
  assert.match(filedHtml, /Your vote for this award is filed/);
});

test('WeeklyCategoryBallotSection shows an honest empty state when the award has no nominees', () => {
  const html = renderToStaticMarkup(
    <WeeklyCategoryBallotSection
      category="goblin_energy_award"
      candidates={[]}
      selectedEntryId={null}
      filedEntryId={null}
      isVotingOpen
      isFiling={false}
      hasChanges={false}
      onSelect={noop}
      onFile={noop}
    />,
  );
  assert.match(html, /No nominees for this award yet/);
  assert.match(html, /Goblin Energy Award/);
});

// --- Canonical results: six winners, honest empty state -----------------

function makeCanonicalResults(winners: Partial<Record<WeeklyVoteCategory, string>>): Record<WeeklyVoteCategory, CanonicalWeeklyResultLike | null> {
  const results = {} as Record<WeeklyVoteCategory, CanonicalWeeklyResultLike | null>;
  for (const category of WEEKLY_VOTE_CATEGORIES) {
    const entryId = winners[category];
    results[category] = entryId
      ? {
        ballotId: getWeeklyCategoryBallotId('2026-W47', category),
        category,
        isFinal: true,
        winner: { entryId, userId: `user-${entryId}`, displayName: `Agent ${entryId}`, voteTotal: 5 },
        validVoteCount: 8,
      }
      : null;
  }
  return results;
}

test('WeeklyAwardsResults renders six winners, one per award, from canonical results', () => {
  const winners: Partial<Record<WeeklyVoteCategory, string>> = {};
  for (const category of WEEKLY_VOTE_CATEGORIES) winners[category] = `entry-${category}`;
  const entriesById: Record<string, any> = {};
  for (const category of WEEKLY_VOTE_CATEGORIES) {
    entriesById[`entry-${category}`] = {
      entryId: `entry-${category}`,
      tripTitle: `Mission ${category}`,
      fieldNote: `Note ${category}`,
      proofImage: `https://example.com/${category}.jpg`,
    };
  }
  const html = renderToStaticMarkup(
    <WeeklyAwardsResults results={makeCanonicalResults(winners)} entriesById={entriesById} />,
  );
  for (const category of WEEKLY_VOTE_CATEGORIES) {
    assert.match(html, new RegExp(`data-category="${category}"`), `missing award slot for ${category}`);
    assert.match(html, new RegExp(`data-winner-entry-id="entry-${category}"`), `missing winner for ${category}`);
  }
  assert.match(html, /5 votes/);
  assert.doesNotMatch(html, /No winner published for this award yet/);
  assert.doesNotMatch(html, /No results published yet/);
});

test('WeeklyAwardsResults is honest about missing awards: winners shown, the rest say so', () => {
  const html = renderToStaticMarkup(
    <WeeklyAwardsResults
      results={makeCanonicalResults({ best_photo_proof: 'entry-photo' })}
      entriesById={{ 'entry-photo': { entryId: 'entry-photo', tripTitle: 'Mission', fieldNote: 'Note', proofImage: 'https://example.com/photo.jpg' } }}
    />,
  );
  assert.match(html, /data-winner-entry-id="entry-photo"/);
  const pending = html.match(/No winner published for this award yet/g) || [];
  assert.equal(pending.length, 5);
});

test('WeeklyAwardsResults with no canonical and no legacy results says so and renders no fake winners', () => {
  const empty = {} as Record<WeeklyVoteCategory, CanonicalWeeklyResultLike | null>;
  for (const category of WEEKLY_VOTE_CATEGORIES) empty[category] = null;
  const html = renderToStaticMarkup(<WeeklyAwardsResults results={empty} />);
  assert.match(html, /No results published yet/);
  assert.doesNotMatch(html, /data-winner-entry-id/);
});

test('WeeklyAwardsResults falls back to legacy winners only when no canonical result exists', () => {
  const empty = {} as Record<WeeklyVoteCategory, CanonicalWeeklyResultLike | null>;
  for (const category of WEEKLY_VOTE_CATEGORIES) empty[category] = null;
  const html = renderToStaticMarkup(
    <WeeklyAwardsResults
      results={empty}
      legacyWinners={{
        best_photo_proof: { entryId: 'legacy-1', userName: 'Legacy Ada', tripTitle: 'Old Mission', fieldNote: 'Old note.', proofImage: 'https://example.com/legacy.jpg', count: 4 },
      }}
    />,
  );
  assert.match(html, /Legacy Ada/);
  assert.match(html, /4 votes/);
  assert.match(html, /data-winner-entry-id="legacy-1"/);
});

// --- Admin move panel ----------------------------------------------------

function makeDraftBallot(category: WeeklyVoteCategory, nominees: Array<{ entryId: string; displayName: string }>): WeeklyCategoryBallotReadModel {
  return {
    category,
    ballotId: getWeeklyCategoryBallotId('2026-W47', category),
    ballotStatus: 'draft',
    ballotExists: true,
    nominees: nominees.map(nominee => ({ ...nominee, id: nominee.entryId, userId: `user-${nominee.entryId}`, categories: [category] })) as any,
    maxVotesPerVoter: 1,
    existingSelectedProofIds: [],
    reason: 'ready',
  };
}

test('buildWeeklyCandidateMoveRows lists each candidate with its current category', () => {
  const rows = buildWeeklyCandidateMoveRows([
    makeDraftBallot('best_photo_proof', [{ entryId: 'entry-a', displayName: 'Agent Ada' }]),
    makeDraftBallot('underdog_award', [{ entryId: 'entry-a', displayName: 'Agent Ada' }]),
    makeDraftBallot('best_field_note', [{ entryId: 'entry-b', displayName: 'Agent Bo' }]),
  ]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], { entryId: 'entry-a', displayName: 'Agent Ada', fromCategory: 'best_photo_proof' });
  assert.deepEqual(rows[1], { entryId: 'entry-a', displayName: 'Agent Ada', fromCategory: 'underdog_award' });
  assert.deepEqual(rows[2], { entryId: 'entry-b', displayName: 'Agent Bo', fromCategory: 'best_field_note' });
});

test('WeeklyCandidateMovePanel shows each candidate, its current award, and a move control per row', () => {
  const html = renderToStaticMarkup(
    <WeeklyCandidateMovePanel
      ballots={[
        makeDraftBallot('best_photo_proof', [{ entryId: 'entry-a', displayName: 'Agent Ada' }]),
        makeDraftBallot('best_field_note', [{ entryId: 'entry-b', displayName: 'Agent Bo' }]),
      ]}
      isMoving={false}
      moveReason="Better fit for this award"
      message={null}
      onMoveReasonChange={noop}
      onMove={noop}
    />,
  );
  assert.match(html, /Agent Ada/);
  assert.match(html, /currently in Best Photo Proof/);
  assert.match(html, /Agent Bo/);
  assert.match(html, /currently in Best Field Note/);
  assert.match(html, /MOVE/);
  assert.doesNotMatch(html, /Ballots are locked/);
});

test('WeeklyCandidateMovePanel hides move controls and says so once ballots leave draft', () => {
  const locked = makeDraftBallot('best_photo_proof', [{ entryId: 'entry-a', displayName: 'Agent Ada' }]);
  locked.ballotStatus = 'locked';
  const html = renderToStaticMarkup(
    <WeeklyCandidateMovePanel
      ballots={[locked]}
      isMoving={false}
      moveReason="Better fit for this award"
      message={null}
      onMoveReasonChange={noop}
      onMove={noop}
    />,
  );
  assert.match(html, /Ballots are locked — moves are refused once the Saturday lock passes/);
  assert.doesNotMatch(html, /MOVE/);
});

test('WeeklyCandidateMovePanel says so when no draft ballots exist yet', () => {
  const html = renderToStaticMarkup(
    <WeeklyCandidateMovePanel
      ballots={[]}
      isMoving={false}
      moveReason="Better fit for this award"
      message={null}
      onMoveReasonChange={noop}
      onMove={noop}
    />,
  );
  assert.match(html, /No draft ballots for the current week yet/);
});
