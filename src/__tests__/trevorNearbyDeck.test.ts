import assert from 'node:assert/strict';
import test from 'node:test';
import { renderTrevorDialogue } from '../content/trevorDialogue';
import { buildTrevorContext, type TrevorContext } from '../services/trevorContextService';
import { getTrevorRecommendation } from '../services/trevorRecommendationEngine';
import type { DeckPack } from '../types/deckPacks';

// Trevor nearby suggestion (Nov 20, 2026): buildTrevorContext passes the
// nearby deck ids through and resolves the display name + region label
// Trevor's dialogue copy needs, from the deck data.

const texasDeck = {
  packId: 'texas-get-it-yall',
  packName: "Get It, Y'all",
  title: "Get It, Y'all",
  shortName: 'Texas',
  description: 'A Texas field deck.',
  missionIds: ['texas-01'],
  unlockRule: 'starter-complete',
  visibility: 'public',
  isActive: true,
  fallbackIcon: 'Star',
  sortOrder: 2,
  homeRegion: { minLat: 25.84, maxLat: 36.5, minLng: -106.65, maxLng: -93.51, label: 'Texas' },
} as unknown as DeckPack;

test('buildTrevorContext passes nearby deck ids through and resolves the display name', () => {
  const context = buildTrevorContext({
    currentRoute: '/basecamp',
    accessibleDecks: [texasDeck],
    nearbyDeckIds: ['texas-get-it-yall'],
  });
  assert.deepEqual(context.nearbyDeckIds, ['texas-get-it-yall']);
  assert.equal(context.nearbyDeckName, "Get It, Y'all");
  assert.equal(context.nearbyRegionLabel, 'Texas');
});

test('buildTrevorContext defaults nearby decks to empty when no location is available', () => {
  const context = buildTrevorContext({
    currentRoute: '/basecamp',
    accessibleDecks: [texasDeck],
  });
  assert.deepEqual(context.nearbyDeckIds, []);
  assert.equal(context.nearbyDeckName, undefined);
  assert.equal(context.nearbyRegionLabel, undefined);
});

test('Trevor names the nearby deck and its region in the suggestion line', () => {
  const base = buildTrevorContext({
    currentRoute: '/basecamp',
    accessibleDecks: [texasDeck],
    nearbyDeckIds: ['texas-get-it-yall'],
  });
  // The built context is a fresh starter profile; lift it to an established
  // explorer so no higher-priority rule masks the nearby rule.
  const context: TrevorContext = {
    ...base,
    legalComplete: true,
    fieldClassificationComplete: true,
    onboardingComplete: true,
    experienceStage: 'established_explorer',
    starterApprovedCount: 3,
    starterRequiredCount: 3,
    starterSubmittedCount: 3,
    starterComplete: true,
    xpForNextLevel: 900,
    xpToNextLevel: 700,
    votingPhase: 'submission',
    zineContentGaps: [],
    profileCompleteness: 100,
    missingProfileFields: [],
  };
  const recommendation = getTrevorRecommendation(context);
  assert.equal(recommendation?.id, 'nearby_deck_texas-get-it-yall');
  assert.equal(
    renderTrevorDialogue(recommendation, context),
    "You're in Texas — Get It, Y'all is right here. Want to start with it?",
  );
});
