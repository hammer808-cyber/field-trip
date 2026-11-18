import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

test('missions bare: no deck card on the Missions page — progress lives in the header', () => {
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

  // Nov 17, 2026 (Zach's call, every deck): the big deck card is gone
  // too — cover art, description, and the "signals remaining" footer.
  // The component stays on disk, parked; Deck.tsx just stops rendering it.
  assert.doesNotMatch(deck, /ActiveDeckPanel/);
  assert.equal(existsSync(join(repoRoot, 'src/components/missions/ActiveDeckPanel.tsx')), true);

  // The progress moved to the header: the deck name plus the counts and
  // the shaded bar, under the hero, always visible.
  assert.match(deck, /<DeckProgressMeter/);
  assert.match(deck, /approvedCount=\{approvedDeckChallengesCount\}/);
  assert.match(deck, /pendingCount=\{pendingDeckChallengesCount\}/);
  assert.match(deck, /totalCount=\{totalDeckChallenges\}/);
  assert.match(deck, /activeDeckDisplayName/);

  // The draw surface and the card are still there — that is the whole page.
  assert.match(deck, /<DeckStack/);
  assert.match(deck, /onDraw=\{handleDraw\}/);
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

test('missions bare: no deck shelf or logbook sections on the Missions page', () => {
  const deck = read('src/pages/Deck.tsx');

  // Nov 17, 2026: the collapsed Deck Shelf and Logbook sections left
  // Missions too. The shelf lives in DEX and the full logbook in Profile.
  assert.doesNotMatch(deck, /DeckShelfPanel/);
  assert.doesNotMatch(deck, /MissionLogbookPanel/);
  assert.doesNotMatch(deck, /<aside/);
  assert.doesNotMatch(deck, /deckShelfSections/);
  assert.doesNotMatch(deck, /handleSelectDeck/);
  assert.doesNotMatch(deck, /logbookItems/);
  assert.doesNotMatch(deck, /logbookCounts/);
  assert.doesNotMatch(deck, /lg:grid-cols-/);

  // The page is a single column now: the mission panel is the page.
  assert.match(deck, /<MissionActionPanel/);
  assert.match(deck, /<MissionDecodedCard/);
});

test('missions bare: the shelf and logbook homes still exist', () => {
  const profile = read('src/pages/Profile.tsx');
  const collection = read('src/pages/Collection.tsx');

  // Full logbook tab in Profile, deck shelf in DEX — Missions reaches the
  // logbook through the guidance strip's "View Proof Status" action.
  assert.match(profile, /logbook/);
  assert.match(collection, /Decks/);
  assert.match(read('src/logic/playerGuidance.ts'), /\/profile\?tab=logbook/);
});
