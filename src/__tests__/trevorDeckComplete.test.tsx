import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Timestamp } from 'firebase/firestore';
import type { TripCard } from '../types/challenges';
import type { DrawnMissionCard, Entry } from '../types/game';
import type { UserProfile } from '../services/userService';
import { buildCanonicalProgress } from '../services/canonicalProgress';
import { buildTrevorRecommendationFromGuidance } from '../services/trevorGuidanceAdapter';
import { buildTrevorContext } from '../services/trevorContextService';
import { renderTrevorDialogue } from '../content/trevorDialogue';
import { TrevorGuideView } from '../components/TrevorGuideView';
import {
  resolvePlayerGuidance,
  type ResolvePlayerGuidanceInput,
} from '../logic/playerGuidance';

// Trevor deck-complete (Nov 20, 2026): any deck finish pops Trevor with a
// ranked short list of 3 next decks (nearby > seasonal > rotation), once
// per deck. Helpers mirror playerGuidance.test.ts.

const NOW = new Date('2026-08-29T18:00:00.000Z');

function entry(overrides: Partial<Entry> = {}): Entry {
  const id = overrides.id || overrides.entryId || 'entry-1';
  return {
    id,
    entryId: id,
    uid: 'guide-user',
    userId: 'guide-user',
    displayName: 'Field Player',
    username: 'field-player',
    challengeId: 'heatwave-18',
    deckId: 'heatwave-receipts',
    status: 'pending_review',
    imageUrl: '/proof.jpg',
    storagePath: null,
    fieldNote: 'A real field note.',
    xpValue: 100,
    xpAwarded: false,
    createdAt: Timestamp.fromDate(NOW),
    updatedAt: Timestamp.fromDate(NOW),
    ...overrides,
  };
}

function trip(overrides: Partial<TripCard> = {}): TripCard {
  return {
    id: 'heatwave-18',
    title: 'Emotional Support Beverage',
    category: 'Evidence Challenge',
    lane: 'seasonal',
    description: 'Capture the drink helping someone continue.',
    difficulty: 'easy',
    estimatedTimeMinutes: 5,
    baseXP: 100,
    personaAffinity: [],
    repeatable: false,
    zineEligible: true,
    snitchEligible: false,
    active: true,
    proofType: ['photo'],
    boostTags: [],
    slowDownTags: [],
    tags: [],
    type: 'Evidence Challenge',
    theAsk: 'Capture the drink.',
    basePoints: 100,
    levels: {
      Standard: { points: 100, description: 'Identify beverage.' },
      Advanced: { points: 125, description: 'Define role.' },
      Certified: { points: 150, description: 'Trevor stamp of approval.' },
    },
    image: '/assets/decks/heatwave-receipts.jpg',
    requiredProof: ['photo'],
    status: 'approved',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    mode: 'solo',
    safetyRules: [],
    deckId: 'heatwave-receipts',
    deckName: 'Heatwave Receipts',
    ...overrides,
  };
}

function profile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'guide-user',
    name: 'Field Player',
    email: 'field@example.com',
    fieldType: null,
    fieldTypeName: null,
    fieldClassificationComplete: true,
    onboardingCompleted: true,
    crewModeUnlocked: true,
    crewModeSeen: true,
    xp: 0,
    soloTripsCount: 0,
    completedCoreChallenges: 0,
    boldTripsCount: 0,
    crewTripsCount: 0,
    rerollsAvailable: 0,
    activeTrip: null,
    lastSnitchDate: null,
    ...overrides,
  };
}

function starterApprovals(): Entry[] {
  return ['starter-1', 'starter-2', 'starter-3'].map((missionId, index) => entry({
    id: `starter-entry-${index + 1}`,
    entryId: `starter-entry-${index + 1}`,
    challengeId: missionId,
    missionId,
    deckId: 'starter-signals',
    status: 'approved',
    approvedAt: Timestamp.fromDate(new Date(`2026-07-0${index + 1}T12:00:00.000Z`)),
  }));
}

function texasApprovals(): Entry[] {
  return Array.from({ length: 15 }, (_, index) => {
    const missionId = `texas-${String(index + 1).padStart(2, '0')}`;
    return entry({
      id: `texas-entry-${index + 1}`,
      entryId: `texas-entry-${index + 1}`,
      challengeId: missionId,
      missionId,
      deckId: 'texas-get-it-yall',
      status: 'approved',
    });
  });
}

function drawnCard(overrides: Partial<DrawnMissionCard> = {}): DrawnMissionCard {
  return {
    id: 'guide-user_heatwave-18',
    uid: 'guide-user',
    missionId: 'heatwave-18',
    challengeId: 'heatwave-18',
    deckId: 'heatwave-receipts',
    missionTitle: 'Emotional Support Beverage',
    missionSummary: 'Capture the drink helping someone continue.',
    drawnAt: Timestamp.fromDate(NOW),
    status: 'drawn',
    isActive: true,
    ...overrides,
  };
}

function input(overrides: Partial<ResolvePlayerGuidanceInput> & { profile?: UserProfile } = {}): ResolvePlayerGuidanceInput {
  const currentProfile = overrides.profile === undefined ? profile() : overrides.profile;
  const entries = overrides.entries ? [...overrides.entries] : [];
  const trips = overrides.trips ? [...overrides.trips] : [];
  return {
    canonicalProgress: overrides.canonicalProgress || buildCanonicalProgress({
      userId: 'guide-user',
      profile: currentProfile,
      entries,
      trips,
      activeMissionId: overrides.activeTrip?.id || null,
      activeSubmissionStatus: overrides.activeSubmissionStatus || null,
      drawnMissionCards: overrides.drawnMissionCards ? [...overrides.drawnMissionCards] : [],
    }),
    entries,
    activeTrip: overrides.activeTrip || null,
    activeSubmissionStatus: overrides.activeSubmissionStatus,
    drawnMissionCards: overrides.drawnMissionCards || [],
    trips,
    tripProgress: overrides.tripProgress,
    nearbyDeckIds: overrides.nearbyDeckIds,
    seenDeckCompletions: overrides.seenDeckCompletions,
    accessibleDeckIds: overrides.accessibleDeckIds,
    seasonalDeckId: overrides.seasonalDeckId,
    legalComplete: overrides.legalComplete ?? true,
    fieldClassificationComplete: overrides.fieldClassificationComplete ?? true,
    hasSeenFieldTypeResults: overrides.hasSeenFieldTypeResults ?? true,
    hasCompletedFieldKitOnboarding: overrides.hasCompletedFieldKitOnboarding ?? true,
    isHeatwaveDeckUnlocked: overrides.isHeatwaveDeckUnlocked ?? false,
    voteAvailable: overrides.voteAvailable ?? false,
    hasUnseenStarterUnlock: overrides.hasUnseenStarterUnlock ?? false,
  };
}

/** Mark a deck complete in canonical progress (approved == total, none left). */
function withDeckCompletion(base: ResolvePlayerGuidanceInput, deckId: string): ResolvePlayerGuidanceInput {
  const existing = base.canonicalProgress.deckProgressById[deckId];
  if (!existing) throw new Error(`No deck progress for ${deckId}`);
  return {
    ...base,
    canonicalProgress: {
      ...base.canonicalProgress,
      deckProgressById: {
        ...base.canonicalProgress.deckProgressById,
        [deckId]: {
          ...existing,
          approvedCount: existing.totalCards,
          eligibleCount: 0,
          remainingCount: 0,
          exhausted: false,
          label: `${existing.totalCards}/${existing.totalCards}`,
          percent: 100,
        },
      },
    },
  };
}

/** Override eligible counts, same pattern as playerGuidance.test.ts. */
function withDeckEligibility(
  base: ResolvePlayerGuidanceInput,
  eligibility: Record<string, number>,
): ResolvePlayerGuidanceInput {
  const deckProgressById = { ...base.canonicalProgress.deckProgressById };
  for (const [deckId, eligibleCount] of Object.entries(eligibility)) {
    const existing = deckProgressById[deckId];
    if (!existing) continue;
    deckProgressById[deckId] = { ...existing, eligibleCount, remainingCount: eligibleCount };
  }
  return { ...base, canonicalProgress: { ...base.canonicalProgress, deckProgressById } };
}

const ACCESSIBLE = ['heatwave-receipts', 'socal-summer', 'gobble-and-glow', 'jet-setter', 'errand-deck', 'texas-get-it-yall'];

test('deck-complete: finished Texas deck pops DECK_COMPLETE with a ranked top 3', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  assert.equal(snapshot.state, 'DECK_COMPLETE');
  assert.equal(snapshot.finishedDeckId, 'texas-get-it-yall');
  assert.equal(snapshot.finishedDeckName, "Get It, Y'all");
  assert.deepEqual(snapshot.nextDeckIds, ['heatwave-receipts', 'socal-summer', 'gobble-and-glow']);
  assert.deepEqual(snapshot.nextDeckNames, ['Heatwave Receipts', 'SoCal Summer', 'Gobble & Glow']);
  assert.equal(snapshot.primaryActionLabel, 'Draw from Heatwave Receipts');
  assert.equal(snapshot.primaryActionDestination, '/missions?pack=heatwave-receipts');
  assert.equal(snapshot.autoOpenTrevor, true);
});

test('deck-complete: real approved entries for all 15 Texas missions are detected', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: [...starterApprovals(), ...texasApprovals()],
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }));
  assert.equal(snapshot.state, 'DECK_COMPLETE');
  assert.equal(snapshot.finishedDeckId, 'texas-get-it-yall');
  assert.equal(snapshot.finishedDeckName, "Get It, Y'all");
});

test('deck-complete ranking: nearby beats seasonal beats rotation', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: [
      ...starterApprovals(),
      // An approved Heatwave entry makes Heatwave recently used, so the
      // rotation slot must skip it for Jet Setter.
      entry({ id: 'heat-ok', entryId: 'heat-ok', status: 'approved', challengeId: 'heatwave-18', missionId: 'heatwave-18' }),
    ],
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    nearbyDeckIds: ['socal-summer'],
    seasonalDeckId: 'gobble-and-glow',
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  assert.equal(snapshot.state, 'DECK_COMPLETE');
  assert.deepEqual(snapshot.nextDeckIds, ['socal-summer', 'gobble-and-glow', 'jet-setter']);
});

test('deck-complete ranking: seasonal beats rotation when no deck is nearby', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: [
      ...starterApprovals(),
      entry({ id: 'heat-ok', entryId: 'heat-ok', status: 'approved', challengeId: 'heatwave-18', missionId: 'heatwave-18' }),
    ],
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    seasonalDeckId: 'gobble-and-glow',
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  assert.deepEqual(snapshot.nextDeckIds, ['gobble-and-glow', 'socal-summer', 'jet-setter']);
});

test('deck-complete ranking: recently used decks backfill rather than shortening the list', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: [
      ...starterApprovals(),
      entry({ id: 'heat-ok', entryId: 'heat-ok', status: 'approved', challengeId: 'heatwave-18', missionId: 'heatwave-18' }),
    ],
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ['heatwave-receipts'],
  }), 'texas-get-it-yall'));
  assert.deepEqual(snapshot.nextDeckIds, ['heatwave-receipts']);
});

test('deck-complete ranking: finished, exhausted, inaccessible, and Starter decks are never suggested', () => {
  const base = withDeckCompletion(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ['heatwave-receipts', 'socal-summer', 'gobble-and-glow', 'jet-setter'],
  }), 'texas-get-it-yall');
  // Gobble finished too (but Texas fires first) and Jet Setter exhausted.
  const gobbleDone = withDeckCompletion(base, 'gobble-and-glow');
  const snapshot = resolvePlayerGuidance(withDeckEligibility(gobbleDone, { 'jet-setter': 0 }));
  assert.equal(snapshot.finishedDeckId, 'texas-get-it-yall');
  assert.deepEqual(snapshot.nextDeckIds, ['heatwave-receipts', 'socal-summer']);
  assert.ok(!snapshot.nextDeckIds?.includes('gobble-and-glow'));
  assert.ok(!snapshot.nextDeckIds?.includes('jet-setter'));
  assert.ok(!snapshot.nextDeckIds?.includes('errand-deck'));
  assert.ok(!snapshot.nextDeckIds?.includes('starter-signals'));
});

test('deck-complete one-shot: an acknowledged finish does not re-fire', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    seenDeckCompletions: ['texas-get-it-yall'],
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  assert.notEqual(snapshot.state, 'DECK_COMPLETE');
  assert.equal(snapshot.state, 'DRAW_MISSION');
  assert.equal(snapshot.autoOpenTrevor, false);
});

test('deck-complete one-shot: a second finished deck fires after the first is acknowledged', () => {
  const base = withDeckCompletion(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    seenDeckCompletions: ['texas-get-it-yall'],
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall');
  const snapshot = resolvePlayerGuidance(withDeckCompletion(base, 'gobble-and-glow'));
  assert.equal(snapshot.state, 'DECK_COMPLETE');
  assert.equal(snapshot.finishedDeckId, 'gobble-and-glow');
  assert.equal(snapshot.finishedDeckName, 'Gobble & Glow');
  assert.ok(!snapshot.nextDeckIds?.includes('gobble-and-glow'));
});

test('deck-complete: repair and active missions still outrank the celebration', () => {
  const repair = resolvePlayerGuidance(withDeckCompletion(input({
    entries: [
      ...starterApprovals(),
      entry({ id: 'needs-more', entryId: 'needs-more', status: 'needs_more_proof', missionTitle: 'Emotional Support Beverage' }),
    ],
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  assert.equal(repair.state, 'REPAIR_PROOF');

  const active = trip({ status: 'in-progress' });
  const resume = resolvePlayerGuidance(withDeckCompletion(input({
    entries: starterApprovals(),
    activeTrip: active,
    trips: [active],
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  assert.equal(resume.state, 'RESUME_ACTIVE_MISSION');
});

test('deck-complete: all decks finished falls through to No Urgent Action', async () => {
  const { DECK_PACKS } = await import('../data/deckPacks');
  const completedChallengeIds = DECK_PACKS.flatMap((pack) => {
    const id = pack.packId || pack.id;
    if (!id) return [];
    return (pack.missionIds || []).filter(Boolean);
  });
  const snapshot = resolvePlayerGuidance(input({
    profile: profile({
      completedChallengeIds,
      approvedCompletedChallengeIds: completedChallengeIds,
    } as any),
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    voteAvailable: false,
  }));
  assert.notEqual(snapshot.state, 'DRAW_MISSION');
  assert.equal(snapshot.state, 'NO_URGENT_ACTION');
});

test('deck-complete adapter: celebration tone, deck_complete line, and 2 extra actions', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  assert.equal(snapshot.state, 'DECK_COMPLETE');
  const recommendation = buildTrevorRecommendationFromGuidance(snapshot);
  assert.equal(recommendation.messageKey, 'deck_complete');
  assert.equal(recommendation.category, 'discovery');
  assert.equal(recommendation.tone, 'celebration');
  assert.equal(recommendation.primaryAction.route, '/missions?pack=heatwave-receipts');
  assert.equal(recommendation.primaryAction.label, 'Draw from Heatwave Receipts');
  assert.equal(recommendation.additionalActions?.length, 2);
  assert.equal(recommendation.additionalActions?.[0].route, '/missions?pack=socal-summer');
  assert.equal(recommendation.additionalActions?.[0].label, 'Draw from SoCal Summer');
  assert.equal(recommendation.additionalActions?.[1].route, '/missions?pack=gobble-and-glow');
  assert.equal(recommendation.additionalActions?.[1].label, 'Draw from Gobble & Glow');
});

test('deck-complete adapter: other states carry no additional actions', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }));
  assert.equal(snapshot.state, 'DRAW_MISSION');
  const recommendation = buildTrevorRecommendationFromGuidance(snapshot);
  assert.equal(recommendation.additionalActions, undefined);
});

test('deck-complete dialogue: Trevor names the finished deck and the next deck', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  const recommendation = buildTrevorRecommendationFromGuidance(snapshot);
  const context = buildTrevorContext({
    currentRoute: '/basecamp',
    finishedDeckName: snapshot.finishedDeckName,
    nextDeckName: snapshot.nextDeckNames?.[0],
  });
  assert.equal(
    renderTrevorDialogue(recommendation, context),
    "Get It, Y'all complete. Heatwave Receipts is next up — or pick another below.",
  );
});

test('deck-complete panel: three draw buttons for the ranked decks', () => {
  const snapshot = resolvePlayerGuidance(withDeckCompletion(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }), 'texas-get-it-yall'));
  const recommendation = buildTrevorRecommendationFromGuidance(snapshot);
  const context = buildTrevorContext({
    currentRoute: '/basecamp',
    finishedDeckName: snapshot.finishedDeckName,
    nextDeckName: snapshot.nextDeckNames?.[0],
  });
  const noop = () => undefined;
  const html = renderToStaticMarkup(
    <TrevorGuideView
      recommendation={recommendation}
      message={renderTrevorDialogue(recommendation, context)}
      isExpanded
      hasNewState={false}
      onOpen={noop}
      onCollapse={noop}
      onAction={noop}
      onSuppress={noop}
    />,
  );
  assert.match(html, /Draw from Heatwave Receipts/);
  assert.match(html, /Draw from SoCal Summer/);
  assert.match(html, /Draw from Gobble &amp; Glow/);
  assert.equal((html.match(/Draw from /g) || []).length, 3);
});

test('deck-complete panel: other states render no extra draw buttons', () => {
  const snapshot = resolvePlayerGuidance(input({
    entries: starterApprovals(),
    isHeatwaveDeckUnlocked: true,
    hasUnseenStarterUnlock: false,
    accessibleDeckIds: ACCESSIBLE,
  }));
  const recommendation = buildTrevorRecommendationFromGuidance(snapshot);
  const noop = () => undefined;
  const html = renderToStaticMarkup(
    <TrevorGuideView
      recommendation={recommendation}
      message="Nothing urgent. Draw a mission when you’re ready."
      isExpanded
      hasNewState={false}
      onOpen={noop}
      onCollapse={noop}
      onAction={noop}
      onSuppress={noop}
    />,
  );
  assert.equal((html.match(/Draw from /g) || []).length, 0);
  assert.match(html, /Draw Another Mission/);
});
