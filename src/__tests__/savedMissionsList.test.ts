import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { getSavedMissionCards } from '../logic/savedMissions';
import type { DrawnMissionCard } from '../types/game';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

// Saved-missions list, Option A (Nov 20, 2026): surface the Dex missions
// tab that already existed but was unreachable, filtered to saved-only,
// with an unsave button and rows that survive a catalog removal.

const card = (overrides: Partial<DrawnMissionCard> = {}): DrawnMissionCard => ({
  id: 'm1',
  missionId: 'm1',
  deckId: 'socal-15',
  missionTitle: 'Test mission',
  missionSummary: 'Do the thing.',
  status: 'saved_for_later',
  drawnAt: '2026-11-20T00:00:00.000Z',
  isActive: false,
  ...overrides,
} as DrawnMissionCard);

test('saved list: only saved_for_later cards survive the filter', () => {
  const kept = getSavedMissionCards([
    card({ missionId: 'saved-1', status: 'saved_for_later' }),
    card({ missionId: 'drawn-1', status: 'drawn' }),
    card({ missionId: 'active-1', status: 'active' }),
    card({ missionId: 'pending-1', status: 'pending_review' }),
    card({ missionId: 'approved-1', status: 'approved' }),
    card({ missionId: 'rejected-1', status: 'rejected' }),
  ]);
  assert.deepEqual(kept.map(c => c.missionId), ['saved-1']);
});

test('saved list: empty in, empty out', () => {
  assert.deepEqual(getSavedMissionCards([]), []);
});

test('dex: the Saved tab is in the hero tabs and routes to /dex/missions', () => {
  const dex = read('src/pages/Collection.tsx');
  assert.match(dex, /\{ id: 'missions', label: 'Saved' \}/);
  assert.match(dex, /missions: '\/dex\/missions'/);
  // A direct visit to /dex/missions selects the tab (not the default).
  assert.match(
    dex,
    /path\.includes\('\/dex\/missions'\)\) \{\s*\n\s*setActiveTab\('missions'\)/
  );
  const app = read('src/App.tsx');
  assert.match(app, /path="\/dex\/missions" element=\{<StarterGate requiredFeature="memories"><Collection \/>/);
});

test('dex: the missions tab renders the saved-only list, not the full history', () => {
  const dex = read('src/pages/Collection.tsx');
  assert.match(dex, /const savedMissionCards = getSavedMissionCards\(drawnMissionCards\);/);
  assert.match(dex, /savedMissionCards\.length === 0/);
  assert.match(dex, /savedMissionCards\.map\(card => \{/);
  assert.doesNotMatch(dex, /drawnMissionCards\.map\(card => \{/);
  assert.doesNotMatch(dex, /drawnMissionCards\.length === 0/);
});

test('dex: a saved mission whose catalog entry is gone still renders from its doc', () => {
  const dex = read('src/pages/Collection.tsx');
  // The fallback branch renders the doc's own title/summary instead of
  // returning null when the catalog lookup misses.
  assert.doesNotMatch(dex, /if \(!mission\) return null;/);
  assert.match(dex, /if \(!mission\) \{/);
  assert.match(dex, /\{card\.missionTitle \|\| 'Saved mission'\}/);
  assert.match(dex, /\{card\.missionSummary\}/);
});

test('dex: unsave archives the card through the context helper', () => {
  const dex = read('src/pages/Collection.tsx');
  assert.match(dex, /unsaveMissionCard,/);
  assert.match(dex, /await unsaveMissionCard\(missionId\)/);
  assert.match(dex, /Unsave/);
  assert.match(dex, /Removing…/);

  const service = read('src/services/missionCardService.ts');
  assert.match(service, /export async function archiveMissionCard\(uid: string, missionId: string\)/);
  assert.match(service, /archived: true,/);

  const context = read('src/context/AppContext.tsx');
  assert.match(context, /unsaveMissionCard: \(missionId: string\) => Promise<void>;/);
  assert.match(context, /return archiveMissionCard\(user\.uid, missionId\);/);
});

test('saved list: no regression on the save and start paths', () => {
  // Save for later still writes saved_for_later from the drawn card and
  // the briefing.
  const deck = read('src/pages/Deck.tsx');
  assert.match(deck, /updateMissionCardStatus\(missionId, 'saved_for_later', \{ isActive: false \}\)/);
  const briefing = read('src/pages/MissionBriefing.tsx');
  assert.match(briefing, /updateMissionCardStatus\(mission\.id, 'saved_for_later', \{ isActive: false \}\)/);
  // Starting a saved mission still goes through the briefing.
  const dex = read('src/pages/Collection.tsx');
  assert.match(dex, /navigate\(`\/mission-briefing\?id=\$\{mission\.id\}`\)/);
  // The subscription still drops archived cards, so an unsaved row stays gone.
  const service = read('src/services/missionCardService.ts');
  assert.match(service, /\.filter\(card => \(card as any\)\.archived !== true/);
  // The dead Bookmark import is gone from DeckLibrary.
  const library = read('src/components/DeckLibrary.tsx');
  assert.doesNotMatch(library, /Bookmark/);
});
