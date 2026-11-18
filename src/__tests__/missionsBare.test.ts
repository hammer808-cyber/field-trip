import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('missions bare: no deck info on the Missions page', () => {
  const deck = read('src/pages/Deck.tsx');

  // Nov 17, 2026: Missions is deck, draw, card — nothing else. The hero
  // no longer carries an Active Deck info card.
  assert.doesNotMatch(deck, /infoCardLabel=\{getDisplayLabel\('ACTIVE_DECK'\)\}/);
  assert.doesNotMatch(deck, /infoCardValue=\{activePack\?\.shortName/);

  // The season countdown strip is gone from Missions (it lives on
  // Basecamp now). No countdown computation left on this page either.
  assert.doesNotMatch(deck, /countdown\?\.label/);
  assert.doesNotMatch(deck, /getSeasonCountdown/);

  // The expandable deck line is gone: no prop, no import, no component.
  assert.doesNotMatch(deck, /deckLine/);
  assert.doesNotMatch(deck, /ExpandableDeckLine/);
  assert.equal(existsSync(join(repoRoot, 'src/components/missions/ExpandableDeckLine.tsx')), false);

  // The draw surface and the card are still there — that is the whole page.
  assert.match(deck, /<ActiveDeckPanel/);
  assert.match(deck, /<MissionDecodedCard/);
  assert.match(deck, /layoutId="mission-draw-card"/);
});

test('missions bare: the mission panel no longer takes a deck line', () => {
  const panel = read('src/components/missions/MissionActionPanel.tsx');
  assert.doesNotMatch(panel, /deckLine/);
});

test('missions bare: Trevor launcher stays off the Missions page', () => {
  const guide = read('src/components/TrevorGuide.tsx');

  // Nov 17, 2026: the floating pill overlaps the poster art, and the card
  // itself carries the resume action — so the collapsed launcher does not
  // render on the Missions routes. An already-open guide still renders.
  assert.match(guide, /location\.pathname === '\/missions'/);
  assert.match(guide, /location\.pathname === '\/deck'/);
  assert.match(guide, /if \(onMissionsPage && !panelState\.isExpanded\) return null;/);
});

test('missions bare: Basecamp carries the active deck row', () => {
  const basecamp = read('src/pages/Basecamp.tsx');

  // The deck info moved here from Missions: one slim row with the deck
  // name, its progress, and the season countdown, tapping through to the
  // shelf in DEX.
  assert.match(basecamp, /Active deck/);
  assert.match(basecamp, /viewModel\.progress\.activeDeckName/);
  assert.match(basecamp, /viewModel\.progress\.activeDeckApprovedCount/);
  assert.match(basecamp, /viewModel\.progress\.activeDeckTotalCount/);
  assert.match(basecamp, /getSeasonCountdown\(activeSeason, currentDate\)/);
  assert.match(basecamp, /seasonCountdown\.label/);
  assert.match(basecamp, /Deck shelf/);
  assert.match(basecamp, /navigate\('\/dex'\)/);
});
