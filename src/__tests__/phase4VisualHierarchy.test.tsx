import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissionsGuidanceStrip, getMissionsStripRole } from '../components/missions/MissionsGuidanceStrip';
import {
  resolveDexNavPresentation,
  SAVE_FOR_LATER_RECOVERY_HINT,
  SAVE_FOR_LATER_RECOVERY_NOTICE,
} from '../components/bottomNavPresentation';
import type { PlayerGuidanceSnapshot } from '../logic/playerGuidance';
import {
  resolvePlayerGuidance,
  type ResolvePlayerGuidanceInput,
} from '../logic/playerGuidance';
import { buildCanonicalProgress } from '../services/canonicalProgress';
import type { TripCard } from '../types/challenges';
import type { DrawnMissionCard } from '../types/game';
import type { UserProfile } from '../services/userService';
import { Timestamp } from 'firebase/firestore';

const bottomNav = readFileSync('src/components/BottomNav.tsx', 'utf8');
const bottomNavCss = readFileSync('src/components/BottomNav.css', 'utf8');
const basecamp = readFileSync('src/pages/Basecamp.tsx', 'utf8');
const signup = readFileSync('src/pages/Auth/SignUp.tsx', 'utf8');
const welcome = readFileSync('src/pages/Welcome.tsx', 'utf8');
const fieldKit = readFileSync('src/components/FieldKitOnboarding.tsx', 'utf8');
const fieldType = readFileSync('src/pages/FieldTypeResult.tsx', 'utf8');
const clipboard = readFileSync('src/components/FieldClipboard.tsx', 'utf8');
const gated = readFileSync('src/components/GatedFeaturePanel.tsx', 'utf8');
const deckSource = readFileSync('src/pages/Deck.tsx', 'utf8');
const briefingSource = readFileSync('src/pages/MissionBriefing.tsx', 'utf8');
const deckShelfSource = readFileSync('src/components/missions/DeckShelfPanel.tsx', 'utf8');

function snapshot(overrides: Partial<PlayerGuidanceSnapshot> = {}): PlayerGuidanceSnapshot {
  return {
    state: 'DRAW_MISSION',
    priority: 700,
    title: 'Draw another mission',
    shortMessage: 'Ready for another receipt.',
    flavorMessage: 'FIELD SIGNAL READY',
    primaryActionLabel: 'Draw Another Mission',
    primaryActionDestination: '/missions',
    relevantMissionId: null,
    navigationTarget: 'missions',
    urgency: 'normal',
    autoOpenTrevor: false,
    secondaryAction: null,
    mission: null,
    primaryActionIntent: 'navigate',
    deckId: 'starter-signals',
    ...overrides,
  };
}

test('Dex current → visible CURRENT/Here treatment', () => {
  const presentation = resolveDexNavPresentation({
    dexUnlocked: true,
    isActive: true,
    isAttentionTarget: false,
  });
  assert.equal(presentation.state, 'current');
  assert.equal(presentation.special, true);
  assert.equal(presentation.showHere, true);
  assert.equal(presentation.showNow, false);
  assert.equal(presentation.markerLabel, 'Here');
  assert.match(bottomNav, /ft-nav-dex--current/);
  assert.match(bottomNav, /data-dex-marker="here"/);
  assert.match(bottomNav, />Here</);
  assert.match(bottomNavCss, /\.ft-nav-dex--current/);
  assert.match(bottomNavCss, /border-style:\s*solid/);
});

test('Dex next while player is elsewhere → visible NEXT/Now treatment', () => {
  const presentation = resolveDexNavPresentation({
    dexUnlocked: true,
    isActive: false,
    isAttentionTarget: true,
  });
  assert.equal(presentation.state, 'attention');
  assert.equal(presentation.special, true);
  assert.equal(presentation.showHere, false);
  assert.equal(presentation.showNow, true);
  assert.equal(presentation.markerLabel, 'Now');
  assert.match(bottomNav, /ft-nav-dex--attention/);
  assert.match(bottomNav, /data-dex-marker="now"/);
  assert.match(bottomNav, />Now</);
  assert.match(bottomNavCss, /\.ft-nav-dex--attention/);
  assert.match(bottomNavCss, /border-style:\s*dashed/);
  assert.match(bottomNavCss, /outline:\s*3px dashed/);
  // Default skin attention uses dashed lime tile vs solid orange current — not hue alone.
  assert.match(bottomNav, /border-dashed/);
  assert.match(bottomNav, /bg-brand-lime/);
});

test('Dex unlocked but normal → neither Here nor Now; not permanently raised', () => {
  const presentation = resolveDexNavPresentation({
    dexUnlocked: true,
    isActive: false,
    isAttentionTarget: false,
  });
  assert.equal(presentation.state, 'normal');
  assert.equal(presentation.special, false);
  assert.equal(presentation.showHere, false);
  assert.equal(presentation.showNow, false);
  assert.equal(presentation.markerLabel, null);
  assert.match(bottomNav, /resolveDexNavPresentation/);
  assert.doesNotMatch(bottomNav, /special: dexUnlocked/);
});

test('Dex locked → Locked; never Now or attention styling', () => {
  const presentation = resolveDexNavPresentation({
    dexUnlocked: false,
    isActive: false,
    isAttentionTarget: true, // must still be ignored when locked
  });
  assert.equal(presentation.state, 'locked');
  assert.equal(presentation.special, false);
  assert.equal(presentation.showHere, false);
  assert.equal(presentation.showNow, false);
  assert.equal(presentation.showLocked, true);
  assert.equal(presentation.markerLabel, 'Locked');
  assert.match(bottomNav, />Locked</);
  // Locked tabs never take the special Dex branch.
  assert.match(bottomNav, /!isLockedTab/);
});

test('nav markup wires Dex presentation into CURRENT / NEXT / LOCKED / NORMAL', () => {
  assert.match(bottomNav, /data-nav-state=\{navState\}/);
  assert.match(bottomNav, /data-nav-state=\{dexNavState\}/);
  assert.match(bottomNav, /dexPresentation\.showHere/);
  assert.match(bottomNav, /dexPresentation\.showNow/);
});

test('save-for-later notice points at Resume on Missions, not the deck shelf', () => {
  assert.match(SAVE_FOR_LATER_RECOVERY_NOTICE, /Tap Resume on Missions/);
  assert.match(SAVE_FOR_LATER_RECOVERY_HINT, /Tap Resume on Missions/);
  assert.match(deckSource, /SAVE_FOR_LATER_RECOVERY_NOTICE/);
  assert.match(briefingSource, /SAVE_FOR_LATER_RECOVERY_HINT/);
  assert.doesNotMatch(deckSource, /Find it in the deck shelf/i);
  assert.doesNotMatch(deckSource, /deck shelf/i);
  assert.doesNotMatch(deckShelfSource, /saved_for_later/);
});

test('saved_for_later guidance recovers via Missions Resume, not Dex/deck shelf', () => {
  const missionTrip: TripCard = {
    id: 'starter-1',
    title: 'The Initial Signal',
    category: 'Evidence Challenge',
    lane: 'core',
    description: 'Take a starter photo.',
    difficulty: 'easy',
    estimatedTimeMinutes: 5,
    baseXP: 50,
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
    theAsk: 'Snap it.',
    basePoints: 50,
    levels: {
      Standard: { points: 50, description: 'Photo.' },
      Advanced: { points: 60, description: 'Photo + note.' },
      Certified: { points: 75, description: 'Certified.' },
    },
    image: '/assets/decks/starter-signals.jpg',
    requiredProof: ['photo'],
    status: 'approved',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    mode: 'solo',
    safetyRules: [],
    deckId: 'starter-signals',
    deckName: 'Starter Signals',
  };

  const savedCard: DrawnMissionCard = {
    id: 'starter-1',
    uid: 'phase4-user',
    missionId: 'starter-1',
    challengeId: 'starter-1',
    deckId: 'starter-signals',
    missionTitle: 'The Initial Signal',
    missionSummary: 'Take a starter photo.',
    status: 'saved_for_later',
    isActive: false,
    drawnAt: Timestamp.fromDate(new Date('2026-08-29T12:00:00.000Z')),
  };

  const profile = {
    id: 'phase4-user',
    name: 'Phase Four',
    email: 'phase4@example.com',
    fieldType: null,
    fieldTypeName: null,
    fieldClassificationComplete: true,
    onboardingCompleted: false,
    crewModeUnlocked: false,
    crewModeSeen: false,
    xp: 0,
    soloTripsCount: 0,
    completedCoreChallenges: 0,
    boldTripsCount: 0,
    crewTripsCount: 0,
    rerollsAvailable: 0,
    activeTrip: missionTrip,
    lastSnitchDate: null,
    createdAt: Timestamp.fromDate(new Date('2026-08-01T00:00:00.000Z')),
  } as unknown as UserProfile;

  const input: ResolvePlayerGuidanceInput = {
    canonicalProgress: buildCanonicalProgress({
      profile,
      entries: [],
      trips: [missionTrip],
      drawnMissionCards: [savedCard],
    }),
    entries: [],
    trips: [missionTrip],
    drawnMissionCards: [savedCard],
    activeTrip: missionTrip,
    legalComplete: true,
    fieldClassificationComplete: true,
    hasSeenFieldTypeResults: true,
    hasCompletedFieldKitOnboarding: true,
    voteAvailable: false,
  };

  const guidance = resolvePlayerGuidance(input);
  assert.equal(guidance.state, 'RESUME_ACTIVE_MISSION');
  assert.equal(guidance.navigationTarget, 'missions');
  assert.match(guidance.primaryActionLabel, /^Resume /);
  assert.match(guidance.primaryActionDestination, /mission-briefing\?id=starter-1/);
  assert.notEqual(guidance.navigationTarget, 'dex');
});

test('Basecamp keeps Loteria and Settings out of the above-the-fold utility row', () => {
  assert.match(basecamp, /What matters today/);
  assert.match(basecamp, /basecamp-utility/);
  assert.match(basecamp, /extraActions=/);
  assert.doesNotMatch(basecamp, /navigate\('\/loteria'\)/);
  assert.match(basecamp, /href: '\/settings'/);
});

test('onboarding defaults use human copy instead of bureau jargon', () => {
  assert.match(welcome, /Get Started/);
  assert.doesNotMatch(signup, /READY_FOR_LAUNCH/);
  assert.doesNotMatch(signup, /PROFILE_SETUP \/\/ AUTH_SECURE/);
  assert.doesNotMatch(fieldKit, /Priority_Handshake/);
  assert.doesNotMatch(fieldKit, /Handshake Complete/);
  assert.doesNotMatch(fieldType, /PROT_CLASSIFICATION/);
  assert.match(fieldType, /Start my first mission/);
});

test('submit control carries the field-note counter and lock screens stay one-CTA', () => {
  assert.match(clipboard, /Submit Proof \(\$\{data\.note\.length\}\/10\)/);
  assert.match(clipboard, /Sending\.\.\./);
  assert.match(gated, /Finish 3 starter missions to open this/);
  assert.match(gated, /Go do a mission/);
});

test('Missions strip is quiet for draw states and dominant for resume/repair', () => {
  assert.equal(getMissionsStripRole('DRAW_MISSION'), 'quiet');
  assert.equal(getMissionsStripRole('DRAW_STARTER_MISSION'), 'quiet');
  assert.equal(getMissionsStripRole('RESUME_ACTIVE_MISSION'), 'dominant');
  assert.equal(getMissionsStripRole('REPAIR_PROOF'), 'dominant');
  const quiet = renderToStaticMarkup(
    <MissionsGuidanceStrip guidance={snapshot()} onPrimary={() => undefined} />,
  );
  assert.match(quiet, /data-strip-role="quiet"/);
  const dominant = renderToStaticMarkup(
    <MissionsGuidanceStrip
      guidance={snapshot({
        state: 'RESUME_ACTIVE_MISSION',
        title: 'Keep going',
        primaryActionLabel: 'Resume Coolest Shadow',
        urgency: 'high',
      })}
      onPrimary={() => undefined}
    />,
  );
  assert.match(dominant, /data-strip-role="dominant"/);
  assert.match(dominant, /Resume Coolest Shadow/);
});

test('active mission panel status never falls back to Draw a Mission while resuming', () => {
  assert.match(deckSource, /isDrawn && displayedMission/);
  assert.match(deckSource, /'In progress'/);
  assert.match(deckSource, /demoteMissionBrowsing && isDrawn/);
});
