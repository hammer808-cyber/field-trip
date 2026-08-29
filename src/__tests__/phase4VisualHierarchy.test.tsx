import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MissionsGuidanceStrip, getMissionsStripRole } from '../components/missions/MissionsGuidanceStrip';
import type { PlayerGuidanceSnapshot } from '../logic/playerGuidance';

const bottomNav = readFileSync('src/components/BottomNav.tsx', 'utf8');
const basecamp = readFileSync('src/pages/Basecamp.tsx', 'utf8');
const signup = readFileSync('src/pages/Auth/SignUp.tsx', 'utf8');
const welcome = readFileSync('src/pages/Welcome.tsx', 'utf8');
const fieldKit = readFileSync('src/components/FieldKitOnboarding.tsx', 'utf8');
const fieldType = readFileSync('src/pages/FieldTypeResult.tsx', 'utf8');
const clipboard = readFileSync('src/components/FieldClipboard.tsx', 'utf8');
const gated = readFileSync('src/components/GatedFeaturePanel.tsx', 'utf8');

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

test('nav markup distinguishes current, attention, locked, and normal states', () => {
  assert.match(bottomNav, /data-nav-state=\{navState\}/);
  assert.match(bottomNav, /data-nav-state=\{isActive \? 'current' : 'attention'\}/);
  assert.match(bottomNav, />Locked</);
  assert.match(bottomNav, />Now</);
  assert.match(bottomNav, />Here</);
  assert.match(bottomNav, /showDexSpecial = itemPathname === '\/dex' && dexUnlocked && \(isActive \|\| isHighlightedDestination\)/);
  assert.doesNotMatch(bottomNav, /special: dexUnlocked/);
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
